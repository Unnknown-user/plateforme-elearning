// Lecture des quiz depuis la base (côté serveur).
// Pour un apprenant, la base ne renvoie jamais les bonnes réponses (table choice_keys protégée).
import { createClient } from "@/lib/supabase/server";
import type { QuestionType } from "@/lib/quiz";

type KeyEmbed = { is_correct: boolean } | { is_correct: boolean }[] | null;

export type ChoiceRow = { id: string; label: string; position: number; isCorrect: boolean | null };
export type QuestionRow = {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  position: number;
  choices: ChoiceRow[];
};
export type QuizRow = {
  id: string;
  module_id: string;
  title: string;
  pass_threshold: number;
  max_attempts: number | null;
  show_correction: boolean;
  questions: QuestionRow[];
};
export type AttemptRow = {
  id: string;
  quiz_id: string;
  score_percent: number;
  points: number;
  max_points: number;
  passed: boolean;
  created_at: string;
};

export type QuizResult = {
  score_percent: number;
  points: number;
  max_points: number;
  passed: boolean;
  attempts_used: number;
  attempts_max: number | null;
  review: { question_id: string; correct: boolean; correct_choice_ids: string[]; explanation: string }[] | null;
};

type RawQuiz = Omit<QuizRow, "questions"> & {
  questions: (Omit<QuestionRow, "choices"> & {
    choices: { id: string; label: string; position: number; choice_keys: KeyEmbed }[];
  })[];
};

const SELECT =
  "id, module_id, title, pass_threshold, max_attempts, show_correction, questions(id, type, prompt, explanation, position, choices(id, label, position, choice_keys(is_correct)))";

function normalize(raw: RawQuiz): QuizRow {
  const questions = [...raw.questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      ...q,
      choices: [...q.choices]
        .sort((a, b) => a.position - b.position)
        .map((c) => {
          const key = Array.isArray(c.choice_keys) ? c.choice_keys[0] : c.choice_keys;
          return { id: c.id, label: c.label, position: c.position, isCorrect: key ? key.is_correct : null };
        }),
    }));
  return { ...raw, questions };
}

/** Les quiz d'un ensemble de modules, indexés par identifiant de module. */
export async function getQuizzesByModule(moduleIds: string[]): Promise<Record<string, QuizRow>> {
  if (moduleIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("quizzes").select(SELECT).in("module_id", moduleIds).returns<RawQuiz[]>();
  const byModule: Record<string, QuizRow> = {};
  (data ?? []).forEach((raw) => (byModule[raw.module_id] = normalize(raw)));
  return byModule;
}

export async function getQuiz(quizId: string): Promise<QuizRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(quizId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("quizzes").select(SELECT).eq("id", quizId).maybeSingle<RawQuiz>();
  return data ? normalize(data) : null;
}

/** Tentatives de la personne connectée, de la plus récente à la plus ancienne. */
export async function getMyAttempts(learnerId: string, quizIds: string[]): Promise<AttemptRow[]> {
  if (quizIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, score_percent, points, max_points, passed, created_at")
    .eq("learner_id", learnerId)
    .in("quiz_id", quizIds)
    .order("created_at", { ascending: false })
    .returns<AttemptRow[]>();
  return data ?? [];
}
