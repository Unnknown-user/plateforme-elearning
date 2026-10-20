"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { validateQuestion, validateQuizSettings } from "@/lib/quiz";
import { assertChanged } from "@/lib/action-error";
import type { FormState } from "./actions";

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

// Toutes les actions exigent le droit « gérer les parcours » ; la base le re-vérifie (RLS).

function settingsFrom(formData: FormData) {
  return validateQuizSettings({
    title: text(formData, "title"),
    threshold: text(formData, "threshold"),
    attempts: text(formData, "attempts"),
    showCorrection: formData.get("showCorrection") === "on",
  });
}

export async function createQuiz(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("course:manage");
  const parsed = settingsFrom(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").insert({
    organization_id: user.organization.id,
    module_id: text(formData, "moduleId"),
    title: parsed.value.title,
    pass_threshold: parsed.value.passThreshold,
    max_attempts: parsed.value.maxAttempts,
    show_correction: parsed.value.showCorrection,
  });
  if (error) return { error: "Le quiz n'a pas pu être créé (ce module en a peut-être déjà un)." };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export async function updateQuizSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("course:manage");
  const parsed = settingsFrom(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .update({
      title: parsed.value.title,
      pass_threshold: parsed.value.passThreshold,
      max_attempts: parsed.value.maxAttempts,
      show_correction: parsed.value.showCorrection,
    })
    .eq("id", text(formData, "quizId"))
    .select("id");
  if (error || !data?.length) return { error: "Les réglages n'ont pas pu être enregistrés." };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export async function deleteQuiz(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.from("quizzes").delete().eq("id", text(formData, "quizId")).select("id");
  assertChanged(error, data, "Le quiz n'a pas pu être supprimé.");
  revalidatePath("/", "layout");
}

export async function addQuestion(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("course:manage");
  const quizId = text(formData, "quizId");

  const parsed = validateQuestion({
    type: text(formData, "type"),
    prompt: text(formData, "prompt"),
    explanation: text(formData, "explanation"),
    choices: formData.getAll("choice").map(String),
    correct: formData.getAll("correct").map(Number).filter(Number.isInteger),
  });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const org = user.organization.id;

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .insert({
      organization_id: org,
      quiz_id: quizId,
      type: parsed.value.type,
      prompt: parsed.value.prompt,
      explanation: parsed.value.explanation,
      position: (count ?? 0) + 1,
    })
    .select("id")
    .single<{ id: string }>();
  if (questionError || !question) return { error: "La question n'a pas pu être ajoutée." };

  const { data: choices, error: choicesError } = await supabase
    .from("choices")
    .insert(
      parsed.value.choices.map((choice, index) => ({
        organization_id: org,
        question_id: question.id,
        label: choice.label,
        position: index + 1,
      })),
    )
    .select("id, position")
    .returns<{ id: string; position: number }[]>();

  let failed = choicesError || !choices;
  if (!failed && choices) {
    const { error: keysError } = await supabase.from("choice_keys").insert(
      choices.map((choice) => ({
        choice_id: choice.id,
        organization_id: org,
        is_correct: parsed.value.choices[choice.position - 1]!.isCorrect,
      })),
    );
    failed = !!keysError;
  }
  if (failed) {
    // Pas de question à moitié créée : on supprime (les choix partent avec, en cascade).
    await supabase.from("questions").delete().eq("id", question.id);
    return { error: "La question n'a pas pu être ajoutée." };
  }

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions").delete().eq("id", text(formData, "questionId")).select("id");
  assertChanged(error, data, "La question n'a pas pu être supprimée.");
  revalidatePath("/", "layout");
}
