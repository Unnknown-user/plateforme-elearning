-- Étape 5 : quiz (questions à choix unique, choix multiple, vrai/faux), tentatives et score.
-- À appliquer dans Supabase (SQL Editor) après 0001 à 0003.
--
-- Sécurité (point clé) :
--  * Les bonnes réponses sont dans une table à part (choice_keys) lisible UNIQUEMENT par
--    l'administrateur et le formateur : l'apprenant ne peut jamais les lire.
--  * Le score est calculé par la fonction submit_quiz_attempt (dans la base), jamais par le
--    navigateur. L'apprenant n'a aucun droit d'écriture direct sur les tentatives.
--
-- Règle de notation : 1 point par question ; une question est juste si l'ensemble des choix cochés
-- est EXACTEMENT l'ensemble des bonnes réponses (pas de points partiels).
-- Score = points / nombre de questions, arrondi en pourcentage ; réussite si score >= seuil.
-- ⚠️ À REVOIR AVANT MISE EN VENTE : règle de notation à valider (points partiels ? pondération ?)
--    et audit de la fonction submit_quiz_attempt.

create type public.question_type as enum ('single', 'multiple', 'true_false');

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  module_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  pass_threshold integer not null default 70 check (pass_threshold between 0 and 100),
  max_attempts integer check (max_attempts is null or max_attempts between 1 and 20),
  show_correction boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (module_id),
  foreign key (module_id, organization_id) references public.modules (id, organization_id) on delete cascade
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quiz_id uuid not null,
  type public.question_type not null,
  prompt text not null check (char_length(prompt) between 1 and 1000),
  explanation text not null default '' check (char_length(explanation) <= 1000),
  position integer not null default 0,
  unique (id, organization_id),
  foreign key (quiz_id, organization_id) references public.quizzes (id, organization_id) on delete cascade
);

create table public.choices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  question_id uuid not null,
  label text not null check (char_length(label) between 1 and 300),
  position integer not null default 0,
  unique (id, organization_id),
  foreign key (question_id, organization_id) references public.questions (id, organization_id) on delete cascade
);

-- Bonnes réponses : table séparée, invisible pour les apprenants.
create table public.choice_keys (
  choice_id uuid primary key,
  organization_id uuid not null,
  is_correct boolean not null,
  foreign key (choice_id, organization_id) references public.choices (id, organization_id) on delete cascade
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quiz_id uuid not null,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  score_percent integer not null check (score_percent between 0 and 100),
  points integer not null,
  max_points integer not null,
  passed boolean not null,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (quiz_id, organization_id) references public.quizzes (id, organization_id) on delete cascade
);

create index quizzes_org_idx on public.quizzes (organization_id);
create index questions_quiz_idx on public.questions (quiz_id);
create index choices_question_idx on public.choices (question_id);
create index quiz_attempts_lookup_idx on public.quiz_attempts (quiz_id, learner_id);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.choice_keys enable row level security;
alter table public.quiz_attempts enable row level security;

-- Un quiz est visible pour un apprenant seulement si le parcours de son module est publié.
create function public.quiz_is_published(p_quiz uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quizzes q
    join public.modules m on m.id = q.module_id
    join public.courses c on c.id = m.course_id
    where q.id = p_quiz and c.status = 'published')
$$;

create function public.question_is_published(p_question uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.questions qu
    where qu.id = p_question and public.quiz_is_published(qu.quiz_id))
$$;

-- Quiz, questions, choix : lecture (apprenant : parcours publié) ; écriture réservée au personnel.
create policy "quizzes_select" on public.quizzes for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or public.quiz_is_published(id)));
create policy "quizzes_insert_staff" on public.quizzes for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "quizzes_update_staff" on public.quizzes for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "quizzes_delete_staff" on public.quizzes for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

create policy "questions_select" on public.questions for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or public.quiz_is_published(quiz_id)));
create policy "questions_insert_staff" on public.questions for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "questions_update_staff" on public.questions for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "questions_delete_staff" on public.questions for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

create policy "choices_select" on public.choices for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or public.question_is_published(question_id)));
create policy "choices_insert_staff" on public.choices for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "choices_update_staff" on public.choices for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "choices_delete_staff" on public.choices for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

-- Bonnes réponses : personnel uniquement, en lecture comme en écriture.
create policy "choice_keys_select_staff" on public.choice_keys for select to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());
create policy "choice_keys_insert_staff" on public.choice_keys for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_staff());
create policy "choice_keys_update_staff" on public.choice_keys for update to authenticated
  using (organization_id = public.current_org_id() and public.is_staff())
  with check (organization_id = public.current_org_id());
create policy "choice_keys_delete_staff" on public.choice_keys for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_staff());

-- Tentatives : l'apprenant voit les siennes, le personnel voit celles de son organisme.
-- Aucune policy d'écriture : seule submit_quiz_attempt peut en créer.
create policy "quiz_attempts_select" on public.quiz_attempts for select to authenticated
  using (organization_id = public.current_org_id() and (public.is_staff() or learner_id = auth.uid()));

-- Envoi d'une tentative : contrôle des droits, limite de tentatives, calcul du score.
-- p_answers = { "<id question>": ["<id choix>", ...], ... }
create function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role public.user_role;
  v_quiz public.quizzes%rowtype;
  v_used integer;
  v_total integer := 0;
  v_points integer := 0;
  v_score integer;
  v_passed boolean;
  v_review jsonb := '[]'::jsonb;
  q record;
  v_selected uuid[];
  v_correct uuid[];
  v_ok boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select organization_id, role into v_org, v_role from public.profiles where id = v_uid;
  if v_org is null or v_role <> 'learner' then raise exception 'not_allowed'; end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id and organization_id = v_org;
  if not found or not public.quiz_is_published(v_quiz.id) then raise exception 'quiz_not_found'; end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'invalid_answers'; end if;

  select count(*) into v_used from public.quiz_attempts where quiz_id = v_quiz.id and learner_id = v_uid;
  if v_quiz.max_attempts is not null and v_used >= v_quiz.max_attempts then
    raise exception 'attempts_exhausted';
  end if;

  for q in select id, explanation from public.questions where quiz_id = v_quiz.id order by position, id loop
    v_total := v_total + 1;

    select coalesce(array_agg(k.choice_id order by k.choice_id), '{}'::uuid[]) into v_correct
      from public.choice_keys k join public.choices c on c.id = k.choice_id
      where c.question_id = q.id and k.is_correct;

    -- On ne retient que les choix qui appartiennent bien à cette question.
    select coalesce(array_agg(distinct c.id order by c.id), '{}'::uuid[]) into v_selected
      from public.choices c
      where c.question_id = q.id
        and c.id::text in (
          select jsonb_array_elements_text(
            case when jsonb_typeof(p_answers -> q.id::text) = 'array' then p_answers -> q.id::text else '[]'::jsonb end));

    v_ok := cardinality(v_correct) > 0 and v_selected = v_correct;
    if v_ok then v_points := v_points + 1; end if;

    v_review := v_review || jsonb_build_array(jsonb_build_object(
      'question_id', q.id, 'correct', v_ok, 'correct_choice_ids', to_jsonb(v_correct), 'explanation', q.explanation));
  end loop;

  if v_total = 0 then raise exception 'empty_quiz'; end if;

  v_score := round(v_points * 100.0 / v_total);
  v_passed := v_score >= v_quiz.pass_threshold;

  insert into public.quiz_attempts (organization_id, quiz_id, learner_id, score_percent, points, max_points, passed, answers)
  values (v_org, v_quiz.id, v_uid, v_score, v_points, v_total, v_passed, p_answers);

  return jsonb_build_object(
    'score_percent', v_score, 'points', v_points, 'max_points', v_total, 'passed', v_passed,
    'attempts_used', v_used + 1, 'attempts_max', v_quiz.max_attempts,
    'review', case when v_quiz.show_correction then v_review else null end);
end $$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
