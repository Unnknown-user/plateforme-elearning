-- Étape 9 : dupliquer un parcours (modules, contenus, quiz, questions et bonnes réponses).
-- À appliquer dans Supabase (SQL Editor) après 0001 à 0006.
--
-- Une seule fonction pour que la copie réussisse en entier ou pas du tout. Elle s'exécute avec les
-- droits de l'appelant (security invoker) : les règles d'isolation (RLS) s'appliquent, donc seul le
-- personnel peut copier, et uniquement un parcours de son organisme.
--
-- La copie est toujours un BROUILLON (rien n'est visible des apprenants). Les inscriptions, traces
-- de progression et tentatives de quiz ne sont pas copiées.
-- Les PDF : la fonction crée le nouveau chemin de fichier et le renvoie ; la copie du fichier lui-même
-- (stockage) est faite par l'application juste après. Chaque copie a son propre fichier : supprimer
-- un PDF dans l'une ne l'efface jamais dans l'autre.

create function public.duplicate_course(p_course_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_course public.courses%rowtype;
  v_new_course uuid;
  v_module record;
  v_new_module uuid;
  v_content record;
  v_quiz record;
  v_new_quiz uuid;
  v_question record;
  v_new_question uuid;
  v_choice record;
  v_new_choice uuid;
  v_new_path text;
  v_files jsonb := '[]'::jsonb;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found then raise exception 'course_not_found'; end if;

  insert into public.courses (organization_id, title, description, objectives, duration_minutes, status, created_by)
  values (v_course.organization_id, left(v_course.title, 108) || ' (copie)', v_course.description,
          v_course.objectives, v_course.duration_minutes, 'draft', auth.uid())
  returning id into v_new_course;

  for v_module in select * from public.modules where course_id = p_course_id order by position, id loop
    insert into public.modules (organization_id, course_id, title, position)
    values (v_module.organization_id, v_new_course, v_module.title, v_module.position)
    returning id into v_new_module;

    for v_content in select * from public.contents where module_id = v_module.id order by position, id loop
      v_new_path := null;
      if v_content.type = 'pdf' then
        v_new_path := v_content.organization_id::text || '/' || v_new_course::text || '/' || gen_random_uuid()::text || '.pdf';
        v_files := v_files || jsonb_build_array(jsonb_build_object('from', v_content.file_path, 'to', v_new_path));
      end if;
      insert into public.contents (organization_id, module_id, type, title, body, url, file_path, position)
      values (v_content.organization_id, v_new_module, v_content.type, v_content.title, v_content.body,
              v_content.url, v_new_path, v_content.position);
    end loop;

    for v_quiz in select * from public.quizzes where module_id = v_module.id loop
      insert into public.quizzes (organization_id, module_id, title, pass_threshold, max_attempts, show_correction)
      values (v_quiz.organization_id, v_new_module, v_quiz.title, v_quiz.pass_threshold, v_quiz.max_attempts, v_quiz.show_correction)
      returning id into v_new_quiz;

      for v_question in select * from public.questions where quiz_id = v_quiz.id order by position, id loop
        insert into public.questions (organization_id, quiz_id, type, prompt, explanation, position)
        values (v_question.organization_id, v_new_quiz, v_question.type, v_question.prompt, v_question.explanation, v_question.position)
        returning id into v_new_question;

        for v_choice in
          select c.label, c.position, coalesce(k.is_correct, false) as is_correct
          from public.choices c left join public.choice_keys k on k.choice_id = c.id
          where c.question_id = v_question.id order by c.position, c.id
        loop
          insert into public.choices (organization_id, question_id, label, position)
          values (v_question.organization_id, v_new_question, v_choice.label, v_choice.position)
          returning id into v_new_choice;
          insert into public.choice_keys (choice_id, organization_id, is_correct)
          values (v_new_choice, v_question.organization_id, v_choice.is_correct);
        end loop;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object('course_id', v_new_course, 'files', v_files);
end $$;

revoke all on function public.duplicate_course(uuid) from public, anon;
grant execute on function public.duplicate_course(uuid) to authenticated;
