-- Étape 4 : parcours, modules et contenus (texte, vidéo par lien, PDF).
-- À appliquer dans Supabase (SQL Editor) après 0001 et 0002.
-- Isolation : chaque ligne porte organization_id ; des clés composites garantissent qu'un module
-- ne peut jamais appartenir à un parcours d'un autre organisme.
-- Visibilité : administrateur et formateur voient tout ; l'apprenant ne voit que les parcours publiés.
-- ⚠️ À REVOIR AVANT MISE EN VENTE : audit des règles ; contrôle d'accès aux PDF au niveau du parcours.

create type public.course_status as enum ('draft', 'published');
create type public.content_type as enum ('text', 'video', 'pdf');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  objectives text not null default '' check (char_length(objectives) <= 2000),
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 100000),
  status public.course_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  course_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (course_id, organization_id) references public.courses (id, organization_id) on delete cascade
);

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  module_id uuid not null,
  type public.content_type not null,
  title text not null check (char_length(title) between 1 and 120),
  body text check (char_length(body) <= 20000),
  url text check (char_length(url) <= 500),
  file_path text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (module_id, organization_id) references public.modules (id, organization_id) on delete cascade,
  -- Un contenu contient ce que son type annonce.
  check (
    (type = 'text' and body is not null)
    or (type = 'video' and url is not null)
    or (type = 'pdf' and file_path is not null)
  )
);

create index courses_organization_id_idx on public.courses (organization_id);
create index modules_course_id_idx on public.modules (course_id);
create index contents_module_id_idx on public.contents (module_id);

alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.contents enable row level security;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() in ('admin', 'trainer'), false)
$$;

-- Parcours
create policy "courses_select" on public.courses for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or status = 'published'));
create policy "courses_insert_staff" on public.courses for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "courses_update_staff" on public.courses for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "courses_delete_staff" on public.courses for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

-- Modules
create policy "modules_select" on public.modules for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_staff() or exists (
      select 1 from public.courses c where c.id = modules.course_id and c.status = 'published'))
  );
create policy "modules_insert_staff" on public.modules for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "modules_update_staff" on public.modules for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "modules_delete_staff" on public.modules for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

-- Contenus
create policy "contents_select" on public.contents for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_staff() or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = contents.module_id and c.status = 'published'))
  );
create policy "contents_insert_staff" on public.contents for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "contents_update_staff" on public.contents for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "contents_delete_staff" on public.contents for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

-- Fichiers PDF : bucket privé (accès par lien temporaire), dossier = identifiant de l'organisme.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-files', 'course-files', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "course_files_select_own_org" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and (storage.foldername(name))[1] = public.current_org_id()::text);
create policy "course_files_insert_staff" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and (storage.foldername(name))[1] = public.current_org_id()::text and public.is_staff());
create policy "course_files_delete_staff" on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and (storage.foldername(name))[1] = public.current_org_id()::text and public.is_staff());
