-- Étape 8 : modifier une question de quiz après sa création.
-- À appliquer dans Supabase (SQL Editor) après 0001 à 0005.
--
-- Pourquoi une fonction : modifier une question touche trois tables (question, choix, bonnes
-- réponses). En une seule fonction, tout réussit ou rien ne change : jamais de question
-- « à moitié modifiée » si une étape échoue.
--
-- Sécurité : la fonction s'exécute avec les droits de l'appelant (security invoker). Les règles
-- d'isolation (RLS) s'appliquent donc comme pour une écriture directe : seul le personnel de
-- l'organisme concerné peut modifier la question.
--
-- Les choix sont recréés (nouveaux identifiants). Les tentatives déjà enregistrées gardent leur
-- score : elles ne sont pas recalculées.

create function public.update_question(
  p_question_id uuid,
  p_type public.question_type,
  p_prompt text,
  p_explanation text,
  p_choices jsonb -- [{ "label": "...", "is_correct": true }, ...] dans l'ordre d'affichage
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_org uuid;
  v_choice uuid;
  v_item jsonb;
  v_position integer := 0;
begin
  if jsonb_typeof(p_choices) is distinct from 'array' then raise exception 'invalid_choices'; end if;

  update public.questions
     set type = p_type, prompt = p_prompt, explanation = p_explanation
   where id = p_question_id
   returning organization_id into v_org;
  -- Aucune ligne : question inexistante, ou refusée par les règles d'isolation.
  if v_org is null then raise exception 'question_not_found'; end if;

  -- Les bonnes réponses (choice_keys) partent avec les choix, en cascade.
  delete from public.choices where question_id = p_question_id;

  for v_item in select * from jsonb_array_elements(p_choices) loop
    v_position := v_position + 1;
    insert into public.choices (organization_id, question_id, label, position)
    values (v_org, p_question_id, v_item ->> 'label', v_position)
    returning id into v_choice;
    insert into public.choice_keys (choice_id, organization_id, is_correct)
    values (v_choice, v_org, (v_item ->> 'is_correct')::boolean);
  end loop;
end $$;

revoke all on function public.update_question(uuid, public.question_type, text, text, jsonb) from public, anon;
grant execute on function public.update_question(uuid, public.question_type, text, text, jsonb) to authenticated;
