-- Étape 10b : groupes d'apprenants (« Promotion 2026 », « Équipe commerciale »...).
-- À appliquer dans Supabase (SQL Editor) après 0001 à 0009.
--
-- Un groupe réunit des apprenants ; on l'inscrit à un parcours d'un seul geste. Un apprenant a donc
-- accès à un parcours publié s'il y est inscrit INDIVIDUELLEMENT ou par l'un de ses GROUPES.
-- La règle reste écrite en un seul endroit (public.is_enrolled, étendue ici) : les règles des
-- parcours, modules, contenus, quiz, temps passé... n'ont pas à changer.
--
-- Les groupes sont réservés au personnel : un apprenant ne voit ni les groupes ni leurs membres.
-- Retirer quelqu'un d'un groupe, ou supprimer un groupe, retire l'accès venant de ce groupe mais
-- CONSERVE les traces (comme une désinscription).
-- ⚠️ À REVOIR AVANT MISE EN VENTE : audit de ces règles ; performance (fonctions appelées ligne par ligne).

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
-- Deux groupes de même nom (majuscules ignorées) dans un organisme prêteraient à confusion.
create unique index groups_org_name_idx on public.groups (organization_id, lower(name));

create table public.group_members (
  group_id uuid not null,
  learner_id uuid not null,
  organization_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (group_id, learner_id),
  foreign key (group_id, organization_id) references public.groups (id, organization_id) on delete cascade,
  foreign key (learner_id, organization_id) references public.profiles (id, organization_id) on delete cascade
);
create index group_members_learner_idx on public.group_members (learner_id);

create table public.group_enrollments (
  group_id uuid not null,
  course_id uuid not null,
  organization_id uuid not null,
  enrolled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, course_id),
  foreign key (group_id, organization_id) references public.groups (id, organization_id) on delete cascade,
  foreign key (course_id, organization_id) references public.courses (id, organization_id) on delete cascade
);
create index group_enrollments_course_idx on public.group_enrollments (course_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_enrollments enable row level security;

-- Tout est réservé au personnel de l'organisme (lecture comme écriture).
create policy "groups_select_staff" on public.groups for select to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());
create policy "groups_insert_staff" on public.groups for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "groups_update_staff" on public.groups for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "groups_delete_staff" on public.groups for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

create policy "group_members_select_staff" on public.group_members for select to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());
-- Seul un compte « apprenant » peut être membre d'un groupe.
create policy "group_members_insert_staff" on public.group_members for insert to authenticated
  with check (
    organization_id = public.current_org_id() and public.is_staff()
    and exists (select 1 from public.profiles p where p.id = group_members.learner_id and p.role = 'learner')
  );
create policy "group_members_delete_staff" on public.group_members for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

create policy "group_enrollments_select_staff" on public.group_enrollments for select to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());
create policy "group_enrollments_insert_staff" on public.group_enrollments for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "group_enrollments_delete_staff" on public.group_enrollments for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

-- Étend LA règle d'accès : inscription individuelle OU inscription par un groupe dont on est membre.
-- (security definer : l'apprenant n'a pas le droit de lire les tables de groupes, mais la règle, si.)
create or replace function public.is_enrolled(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrollments e where e.course_id = p_course and e.learner_id = auth.uid())
      or exists (
        select 1 from public.group_members gm
        join public.group_enrollments ge on ge.group_id = gm.group_id
        where gm.learner_id = auth.uid() and ge.course_id = p_course)
$$;

-- Inscriptions effectives (individuelles + par groupe) : le personnel obtient celles de son organisme,
-- un apprenant uniquement les siennes. Sert au suivi, aux exports et aux attestations.
create function public.effective_enrollments() returns table (course_id uuid, learner_id uuid)
language sql stable security definer set search_path = '' as $$
  select e.course_id, e.learner_id
  from public.enrollments e
  where e.organization_id = public.current_org_id() and (public.is_staff() or e.learner_id = auth.uid())
  union
  select ge.course_id, gm.learner_id
  from public.group_enrollments ge
  join public.group_members gm on gm.group_id = ge.group_id
  where ge.organization_id = public.current_org_id() and (public.is_staff() or gm.learner_id = auth.uid())
$$;

revoke all on function public.effective_enrollments() from public, anon;
grant execute on function public.effective_enrollments() to authenticated;
