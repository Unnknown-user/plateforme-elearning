-- Étape 2 : organismes, profils utilisateurs et isolation (Row Level Security).
-- À appliquer dans Supabase une fois le projet créé. Données fictives uniquement.
-- ⚠️ À REVOIR AVANT MISE EN VENTE : audit de ces règles par un développeur / expert sécurité.

create type public.user_role as enum ('admin', 'trainer', 'learner');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text not null default '#1d4ed8',
  created_at timestamptz not null default now()
);

-- Un profil = un utilisateur (compte géré par Supabase Auth) rattaché à UN seul organisme.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  created_at timestamptz not null default now()
);
create index profiles_organization_id_idx on public.profiles (organization_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

-- Fonctions d'aide : organisme et rôle de la personne connectée.
-- "security definer" évite que les règles ne se rappellent elles-mêmes à l'infini.
create function public.current_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Organismes : on ne voit que le sien ; seul l'administrateur le modifie.
create policy "organizations_select_own" on public.organizations
  for select to authenticated using (id = public.current_org_id());

create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (id = public.current_org_id() and public.current_user_role() = 'admin')
  with check (id = public.current_org_id());

-- Profils : on voit les membres de son organisme (admin et formateur) ou soi-même (apprenant).
create policy "profiles_select" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or (organization_id = public.current_org_id() and public.current_user_role() in ('admin', 'trainer'))
  );

-- Seul l'administrateur modifie les profils de son organisme ; jamais d'un autre organisme.
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (organization_id = public.current_org_id() and public.current_user_role() = 'admin')
  with check (organization_id = public.current_org_id());

-- Pas de policy d'insertion / suppression : la création des comptes passe par le serveur
-- (invitation par l'administrateur), jamais directement depuis le navigateur.
