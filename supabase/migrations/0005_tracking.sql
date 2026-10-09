-- Étape 6 : suivi de progression, temps passé, mentions légales de l'organisme (traces Qualiopi).
-- À appliquer dans Supabase (SQL Editor) après 0001 à 0004.
--
-- Principes :
--  * L'apprenant ne peut écrire QUE par deux fonctions contrôlées (mark_content_done, track_course_time).
--  * Le temps est comptabilisé par petits pas et plafonné au temps réellement écoulé : impossible de gonfler.
--  * Le personnel voit les traces de son organisme ; l'apprenant voit les siennes.
-- ⚠️ À REVOIR AVANT MISE EN VENTE : le temps passé est une mesure d'activité à l'écran (approximation),
--    pas une preuve d'assiduité ; durée de conservation des traces et droit à l'effacement (RGPD).

-- Mentions légales de l'organisme, utilisées sur l'attestation.
alter table public.organizations
  add column activity_number text check (activity_number is null or char_length(activity_number) <= 60),
  add column signatory_name text check (signatory_name is null or char_length(signatory_name) <= 80),
  add column signatory_title text check (signatory_title is null or char_length(signatory_title) <= 80);

-- Clé composite nécessaire pour relier une trace à un contenu du même organisme.
alter table public.contents add constraint contents_id_org_key unique (id, organization_id);

create table public.content_completions (
  learner_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null,
  organization_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key (learner_id, content_id),
  foreign key (content_id, organization_id) references public.contents (id, organization_id) on delete cascade
);

create table public.course_time (
  learner_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null,
  organization_id uuid not null,
  seconds integer not null default 0 check (seconds >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (learner_id, course_id),
  foreign key (course_id, organization_id) references public.courses (id, organization_id) on delete cascade
);

create index content_completions_org_idx on public.content_completions (organization_id);
create index course_time_org_idx on public.course_time (organization_id);

alter table public.content_completions enable row level security;
alter table public.course_time enable row level security;

-- Lecture : ses propres traces (apprenant) ou celles de l'organisme (personnel). Aucune écriture directe.
create policy "content_completions_select" on public.content_completions for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or learner_id = auth.uid()));
create policy "course_time_select" on public.course_time for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or learner_id = auth.uid()));

-- Marquer un contenu comme terminé (ou annuler). Réservé aux apprenants, parcours publié uniquement.
create function public.mark_content_done(p_content_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role public.user_role;
  v_content_org uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select organization_id, role into v_org, v_role from public.profiles where id = v_uid;
  if v_org is null or v_role <> 'learner' then raise exception 'not_allowed'; end if;

  select c.organization_id into v_content_org
    from public.contents c
    join public.modules m on m.id = c.module_id
    join public.courses co on co.id = m.course_id
    where c.id = p_content_id and co.status = 'published';
  if v_content_org is null or v_content_org <> v_org then raise exception 'content_not_found'; end if;

  if p_done then
    insert into public.content_completions (learner_id, content_id, organization_id)
    values (v_uid, p_content_id, v_org) on conflict do nothing;
  else
    delete from public.content_completions where learner_id = v_uid and content_id = p_content_id;
  end if;
end $$;

-- Temps passé : appelée toutes les ~30 s par la page ouverte. L'incrément est plafonné
-- (60 s par appel ET au temps réellement écoulé depuis le dernier signal + 5 s de tolérance).
create function public.track_course_time(p_course_id uuid, p_seconds integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role public.user_role;
  v_last timestamptz;
  v_elapsed integer;
  v_add integer;
  v_total integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select organization_id, role into v_org, v_role from public.profiles where id = v_uid;
  if v_org is null or v_role <> 'learner' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.courses where id = p_course_id and organization_id = v_org and status = 'published') then
    raise exception 'course_not_found';
  end if;

  select last_seen_at into v_last from public.course_time where learner_id = v_uid and course_id = p_course_id;
  if v_last is null then
    -- Premier signal : on crée la ligne, avec au plus 30 s.
    insert into public.course_time (learner_id, course_id, organization_id, seconds)
    values (v_uid, p_course_id, v_org, greatest(0, least(p_seconds, 30)))
    returning seconds into v_total;
    return v_total;
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (now() - v_last)))::integer + 5);
  v_add := greatest(0, least(p_seconds, 60, v_elapsed));
  update public.course_time
    set seconds = seconds + v_add, last_seen_at = now()
    where learner_id = v_uid and course_id = p_course_id
    returning seconds into v_total;
  return v_total;
end $$;

revoke all on function public.mark_content_done(uuid, boolean) from public, anon;
revoke all on function public.track_course_time(uuid, integer) from public, anon;
grant execute on function public.mark_content_done(uuid, boolean) to authenticated;
grant execute on function public.track_course_time(uuid, integer) to authenticated;
