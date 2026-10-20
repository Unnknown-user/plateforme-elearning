-- Étape 10 : inscription des apprenants à un parcours.
-- À appliquer dans Supabase (SQL Editor) après 0001 à 0007.
--
-- Nouvelle règle d'accès : un apprenant ne voit un parcours (et ses modules, contenus, quiz) que s'il
-- est PUBLIÉ ET qu'il y est INSCRIT. Le personnel (administrateur, formateur) voit toujours tout.
-- La règle est écrite UNE fois, dans public.can_access_course ; la fonction public.is_enrolled dit
-- si la personne connectée est inscrite (aujourd'hui : inscription individuelle ; les groupes
-- l'étendront dans une migration suivante sans toucher aux règles).
--
-- Se désinscrire retire l'accès mais CONSERVE les traces (contenus terminés, temps, tentatives) :
-- elles restent consultables par le personnel (historique Qualiopi).
--
-- Reprise de l'existant : tous les apprenants sont inscrits aux parcours déjà publiés, pour que la
-- démonstration continue de fonctionner à l'identique.
-- ⚠️ À REVOIR AVANT MISE EN VENTE : audit de ces règles ; performance (fonctions appelées ligne par ligne).

-- Clé composite : une inscription ne peut relier qu'un parcours et un apprenant du MÊME organisme.
alter table public.profiles add constraint profiles_id_org_key unique (id, organization_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  course_id uuid not null,
  learner_id uuid not null,
  enrolled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, learner_id),
  foreign key (course_id, organization_id) references public.courses (id, organization_id) on delete cascade,
  foreign key (learner_id, organization_id) references public.profiles (id, organization_id) on delete cascade
);
create index enrollments_learner_idx on public.enrollments (learner_id);
create index enrollments_org_idx on public.enrollments (organization_id);

alter table public.enrollments enable row level security;

-- Lecture : ses propres inscriptions (apprenant) ou celles de l'organisme (personnel).
create policy "enrollments_select" on public.enrollments for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or learner_id = auth.uid()));
-- Écriture : personnel uniquement, et seulement pour un compte « apprenant ».
create policy "enrollments_insert_staff" on public.enrollments for insert to authenticated
  with check (
    organization_id = public.current_org_id() and public.is_staff()
    and exists (select 1 from public.profiles p where p.id = enrollments.learner_id and p.role = 'learner')
  );
create policy "enrollments_delete_staff" on public.enrollments for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());
-- Pas de modification : on inscrit ou on désinscrit.

-- La personne connectée est-elle inscrite à ce parcours ?
create function public.is_enrolled(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e where e.course_id = p_course and e.learner_id = auth.uid())
$$;

-- LA règle d'accès à un parcours : personnel de l'organisme, ou apprenant inscrit à un parcours publié.
create function public.can_access_course(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course
      and c.organization_id = public.current_org_id()
      and (public.is_staff() or (c.status = 'published' and public.is_enrolled(c.id))))
$$;

-- Parcours, modules, contenus : toutes les lectures passent par can_access_course.
drop policy "courses_select" on public.courses;
create policy "courses_select" on public.courses for select to authenticated
  using (organization_id = public.current_org_id() and public.can_access_course(id));

drop policy "modules_select" on public.modules;
create policy "modules_select" on public.modules for select to authenticated
  using (organization_id = public.current_org_id() and public.can_access_course(course_id));

drop policy "contents_select" on public.contents;
create policy "contents_select" on public.contents for select to authenticated
  using (
    organization_id = public.current_org_id()
    and exists (select 1 from public.modules m where m.id = contents.module_id and public.can_access_course(m.course_id))
  );

-- Quiz : le nom « quiz_is_published » est conservé pour ne pas toucher aux règles des quiz,
-- questions et choix qui l'appellent. Il signifie désormais « quiz accessible à la personne connectée ».
-- submit_quiz_attempt l'utilise aussi : un apprenant non inscrit ne peut pas envoyer de tentative.
create or replace function public.quiz_is_published(p_quiz uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quizzes q
    join public.modules m on m.id = q.module_id
    where q.id = p_quiz and public.can_access_course(m.course_id))
$$;

-- Contenu terminé : parcours publié ET inscription exigés.
create or replace function public.mark_content_done(p_content_id uuid, p_done boolean) returns void
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
    where c.id = p_content_id and co.status = 'published' and public.is_enrolled(co.id);
  if v_content_org is null or v_content_org <> v_org then raise exception 'content_not_found'; end if;

  if p_done then
    insert into public.content_completions (learner_id, content_id, organization_id)
    values (v_uid, p_content_id, v_org) on conflict do nothing;
  else
    delete from public.content_completions where learner_id = v_uid and content_id = p_content_id;
  end if;
end $$;

-- Temps passé : parcours publié ET inscription exigés (reste identique pour le reste).
create or replace function public.track_course_time(p_course_id uuid, p_seconds integer) returns integer
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
  if not exists (
    select 1 from public.courses
    where id = p_course_id and organization_id = v_org and status = 'published' and public.is_enrolled(p_course_id)
  ) then
    raise exception 'course_not_found';
  end if;

  select last_seen_at into v_last from public.course_time where learner_id = v_uid and course_id = p_course_id;
  if v_last is null then
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

-- Reprise de l'existant : chaque apprenant est inscrit aux parcours déjà publiés de son organisme.
insert into public.enrollments (organization_id, course_id, learner_id)
select c.organization_id, c.id, p.id
from public.courses c
join public.profiles p on p.organization_id = c.organization_id and p.role = 'learner'
where c.status = 'published'
on conflict do nothing;
