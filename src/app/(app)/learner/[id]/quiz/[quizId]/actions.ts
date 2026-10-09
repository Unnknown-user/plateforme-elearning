"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { submitErrorMessage } from "@/lib/quiz";
import type { QuizResult } from "@/lib/quizzes";

export type SubmitState = { error: string | null; result: QuizResult | null };

// Envoie les réponses à la base, qui calcule seule le score (voir submit_quiz_attempt).
export async function submitQuiz(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  await requireUser("course:take");
  const quizId = String(formData.get("quizId") ?? "");

  // Les champs sont nommés « q_<id de la question> » ; chaque valeur est un id de choix coché.
  const answers: Record<string, string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("q_")) answers[key.slice(2)] = formData.getAll(key).map(String);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_quiz_id: quizId, p_answers: answers });
  if (error) return { error: submitErrorMessage(error.message), result: null };

  revalidatePath("/", "layout");
  return { error: null, result: data as QuizResult };
}
