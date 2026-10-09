-- Données de démonstration FICTIVES du suivi : 3 apprenants de plus, activité variée, mentions légales fictives.
-- À exécuter après 0005_tracking.sql, seed.sql, seed_courses.sql et seed_quizzes.sql.
-- Ré-exécutable : les lignes déjà présentes sont ignorées.
-- Mot de passe de tous les comptes de démo : le même que les autres (voir README).

-- Mentions légales fictives (numéros inventés, uniquement pour la démonstration).
update public.organizations set
  activity_number = '11 75 00000 75 (fictif)',
  signatory_name = U&'H\00e9l\00e8ne Marchand',
  signatory_title = 'Directrice'
where id = 'a0000000-0000-4000-8000-000000000001' and activity_number is null;
update public.organizations set
  activity_number = '84 69 00000 69 (fictif)',
  signatory_name = 'Nadia Roche',
  signatory_title = U&'G\00e9rante'
where id = 'b0000000-0000-4000-8000-000000000002' and activity_number is null;

-- Apprenants supplémentaires
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('a1000000-0000-4000-8000-000000000004'::uuid, 'thomas@horizon.test', 'Thomas Girard', 'a0000000-0000-4000-8000-000000000001'::uuid),
      ('a1000000-0000-4000-8000-000000000005'::uuid, 'camille@horizon.test', 'Camille Petit', 'a0000000-0000-4000-8000-000000000001'::uuid),
      ('b1000000-0000-4000-8000-000000000004'::uuid, 'julien@lumiere.test', 'Julien Moreau', 'b0000000-0000-4000-8000-000000000002'::uuid)
    ) as t(id, email, full_name, organization_id)
  loop
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
    values (gen_random_uuid(), u.id, u.id::text, 'email',
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now())
    on conflict (provider_id, provider) do nothing;

    insert into public.profiles (id, organization_id, role, full_name)
    values (u.id, u.organization_id, 'learner', u.full_name) on conflict (id) do nothing;
  end loop;
end $$;

-- Activité : p_contents = nombre de contenus terminés (null = tous), p_quiz_score = score d'une tentative (null = aucune).
create function pg_temp.activity(
  p_learner uuid, p_course uuid, p_contents integer, p_seconds integer, p_start timestamptz, p_quiz_score integer
) returns void language plpgsql as $$
declare
  v_org uuid; r record; n integer := 0;
  v_quiz uuid; v_threshold integer;
begin
  select organization_id into v_org from public.courses where id = p_course;

  for r in
    select c.id from public.contents c join public.modules m on m.id = c.module_id
    where m.course_id = p_course order by m.position, c.position, c.id
  loop
    exit when p_contents is not null and n >= p_contents;
    n := n + 1;
    insert into public.content_completions (learner_id, content_id, organization_id, completed_at)
    values (p_learner, r.id, v_org, p_start + n * interval '12 minutes') on conflict do nothing;
  end loop;

  if p_seconds > 0 then
    insert into public.course_time (learner_id, course_id, organization_id, seconds, first_seen_at, last_seen_at)
    values (p_learner, p_course, v_org, p_seconds, p_start, p_start + n * interval '12 minutes' + interval '5 minutes')
    on conflict do nothing;
  end if;

  if p_quiz_score is not null then
    select qz.id, qz.pass_threshold into v_quiz, v_threshold
      from public.quizzes qz join public.modules m on m.id = qz.module_id
      where m.course_id = p_course limit 1;
    if v_quiz is not null and not exists (select 1 from public.quiz_attempts where quiz_id = v_quiz and learner_id = p_learner) then
      insert into public.quiz_attempts (organization_id, quiz_id, learner_id, score_percent, points, max_points, passed, answers, created_at)
      values (v_org, v_quiz, p_learner, p_quiz_score, round(p_quiz_score * 3 / 100.0), 3, p_quiz_score >= v_threshold, '{}',
              p_start + n * interval '12 minutes' + interval '20 minutes');
    end if;
  end if;
end $$;

-- Horizon : Léa Fontaine  (1 parcours terminé, 1 en cours)
select pg_temp.activity('a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004', null, 5400, '2026-09-22 08:30+00', null);
select pg_temp.activity('a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 5, 1800, '2026-09-29 13:00+00', null);
-- Horizon : Thomas Girard (1 terminé avec quiz réussi, 1 en cours, 1 démarré)
select pg_temp.activity('a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', null, 7200, '2026-09-15 09:00+00', 100);
select pg_temp.activity('a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002', 4, 2400, '2026-09-24 14:00+00', null);
select pg_temp.activity('a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000004', 2, 600, '2026-10-02 10:00+00', null);
-- Horizon : Camille Petit (1 terminé, 1 à peine démarré)
select pg_temp.activity('a1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004', null, 4800, '2026-09-30 09:30+00', null);
select pg_temp.activity('a1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', 1, 300, '2026-10-05 16:00+00', null);
-- Lumière : Inès Caron (terminé, quiz réussi à exactement 67 % = seuil), Julien Moreau (en cours, quiz échoué)
select pg_temp.activity('b1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000001', null, 6000, '2026-09-18 09:00+00', 67);
select pg_temp.activity('b1000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000000001', 4, 2100, '2026-10-01 11:00+00', 33);
