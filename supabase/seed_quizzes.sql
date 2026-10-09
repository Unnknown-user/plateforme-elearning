-- Quiz de démonstration FICTIFS (texte « lorem ipsum »). À exécuter après 0004_quizzes.sql.
-- Un quiz de 3 questions (choix unique, choix multiple, vrai/faux) sur le 1er module de 3 parcours.
-- Ré-exécutable : un module qui a déjà un quiz est ignoré.

create function pg_temp.seed_quiz(
  p_course uuid, p_title text, p_threshold integer, p_attempts integer, p_correction boolean
) returns void language plpgsql as $$
declare
  v_module uuid; v_org uuid; v_quiz uuid; v_q uuid; v_choice uuid;
  i integer;
begin
  select m.id, m.organization_id into v_module, v_org
    from public.modules m where m.course_id = p_course order by m.position limit 1;
  if v_module is null then return; end if;

  insert into public.quizzes (organization_id, module_id, title, pass_threshold, max_attempts, show_correction)
  values (v_org, v_module, p_title, p_threshold, p_attempts, p_correction)
  on conflict (module_id) do nothing returning id into v_quiz;
  if v_quiz is null then return; end if;

  -- Question 1 : choix unique (bonne réponse : la 2e)
  insert into public.questions (organization_id, quiz_id, type, prompt, explanation, position)
  values (v_org, v_quiz, 'single', 'Lorem ipsum dolor sit amet, quelle proposition est exacte ?',
          'Consectetur adipiscing elit : la deuxième proposition est la bonne.', 1) returning id into v_q;
  for i in 1..4 loop
    insert into public.choices (organization_id, question_id, label, position)
    values (v_org, v_q, 'Proposition ' || i || ' : sed do eiusmod tempor', i) returning id into v_choice;
    insert into public.choice_keys (choice_id, organization_id, is_correct) values (v_choice, v_org, i = 2);
  end loop;

  -- Question 2 : choix multiple (bonnes réponses : 1re et 3e)
  insert into public.questions (organization_id, quiz_id, type, prompt, explanation, position)
  values (v_org, v_quiz, 'multiple', 'Ut enim ad minim veniam : cochez toutes les bonnes réponses.',
          'Les propositions 1 et 3 sont correctes.', 2) returning id into v_q;
  for i in 1..4 loop
    insert into public.choices (organization_id, question_id, label, position)
    values (v_org, v_q, 'Option ' || i || ' : quis nostrud exercitation', i) returning id into v_choice;
    insert into public.choice_keys (choice_id, organization_id, is_correct) values (v_choice, v_org, i in (1, 3));
  end loop;

  -- Question 3 : vrai / faux (réponse : Vrai)
  insert into public.questions (organization_id, quiz_id, type, prompt, explanation, position)
  values (v_org, v_quiz, 'true_false', 'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
          'Excepteur sint occaecat cupidatat non proident : l''affirmation est vraie.', 3) returning id into v_q;
  insert into public.choices (organization_id, question_id, label, position) values (v_org, v_q, 'Vrai', 1) returning id into v_choice;
  insert into public.choice_keys (choice_id, organization_id, is_correct) values (v_choice, v_org, true);
  insert into public.choices (organization_id, question_id, label, position) values (v_org, v_q, 'Faux', 2) returning id into v_choice;
  insert into public.choice_keys (choice_id, organization_id, is_correct) values (v_choice, v_org, false);
end $$;

-- Horizon : seuil 70 %, 3 tentatives, correction affichée
select pg_temp.seed_quiz('c1000000-0000-4000-8000-000000000001', 'Quiz : les idées clés', 70, 3, true);
-- Horizon : seuil 80 %, tentatives illimitées, correction masquée
select pg_temp.seed_quiz('c1000000-0000-4000-8000-000000000002', 'Évaluation : les bons réflexes', 80, null, false);
-- Lumière : seuil 67 %, 2 tentatives, correction affichée
select pg_temp.seed_quiz('c2000000-0000-4000-8000-000000000001', 'Quiz : conduire une réunion', 67, 2, true);
