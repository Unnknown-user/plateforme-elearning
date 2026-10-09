-- Données de démonstration FICTIVES : 2 organismes, 3 rôles chacun.
-- À exécuter une fois dans Supabase (SQL Editor), APRÈS 0001_organizations_and_profiles.sql.
-- Ré-exécutable sans risque : les lignes déjà présentes sont ignorées.
-- ⚠️ À REVOIR AVANT MISE EN VENTE : mot de passe de démo volontairement simple, jamais en production.
-- Les noms accentués sont écrits en séquences U&'\00e9' pour survivre à tout copier-coller.
-- Mot de passe de tous les comptes de démo : Demo-Elearning-2026!

insert into public.organizations (id, name, primary_color) values
  ('a0000000-0000-4000-8000-000000000001', 'Institut Horizon Formation', '#1d4ed8'),
  ('b0000000-0000-4000-8000-000000000002', U&'Atelier Lumi\00e8re Conseil', '#b45309')
on conflict (id) do nothing;

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('a1000000-0000-4000-8000-000000000001'::uuid, 'admin@horizon.test',      U&'H\00e9l\00e8ne Marchand', 'admin'::public.user_role,   'a0000000-0000-4000-8000-000000000001'::uuid),
      ('a1000000-0000-4000-8000-000000000002'::uuid, 'formateur@horizon.test',  'Paul Berthier',    'trainer'::public.user_role, 'a0000000-0000-4000-8000-000000000001'::uuid),
      ('a1000000-0000-4000-8000-000000000003'::uuid, 'apprenant@horizon.test',  U&'L\00e9a Fontaine',    'learner'::public.user_role, 'a0000000-0000-4000-8000-000000000001'::uuid),
      ('b1000000-0000-4000-8000-000000000001'::uuid, 'admin@lumiere.test',      'Nadia Roche',      'admin'::public.user_role,   'b0000000-0000-4000-8000-000000000002'::uuid),
      ('b1000000-0000-4000-8000-000000000002'::uuid, 'formateur@lumiere.test',  'Marc Delorme',     'trainer'::public.user_role, 'b0000000-0000-4000-8000-000000000002'::uuid),
      ('b1000000-0000-4000-8000-000000000003'::uuid, 'apprenant@lumiere.test',  U&'In\00e8s Caron',      'learner'::public.user_role, 'b0000000-0000-4000-8000-000000000002'::uuid)
    ) as t(id, email, full_name, role, organization_id)
  loop
    -- Compte de connexion (table gérée par Supabase Auth)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Demo-Elearning-2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text, 'email',
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      now(), now(), now()
    ) on conflict (provider_id, provider) do nothing;

    -- Profil métier : organisme + rôle
    insert into public.profiles (id, organization_id, role, full_name)
    values (u.id, u.organization_id, u.role, u.full_name)
    on conflict (id) do nothing;
  end loop;
end $$;
