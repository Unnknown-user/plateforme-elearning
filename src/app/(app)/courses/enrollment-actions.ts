"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { assertChanged } from "@/lib/action-error";

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

// Toutes les actions exigent le droit « gérer les parcours » ; la base le re-vérifie (RLS) et refuse
// d'inscrire un compte qui n'est pas apprenant ou qui appartient à un autre organisme.

export async function enrollLearner(formData: FormData): Promise<void> {
  const user = await requireUser("course:manage");
  const supabase = await createClient();
  // « ignoreDuplicates » : inscrire deux fois la même personne ne fait rien (pas d'erreur).
  const { error } = await supabase
    .from("enrollments")
    .upsert(
      { organization_id: user.organization.id, course_id: text(formData, "courseId"), learner_id: text(formData, "learnerId"), enrolled_by: user.id },
      { onConflict: "course_id,learner_id", ignoreDuplicates: true },
    );
  if (error) throw new Error("L'inscription n'a pas pu être enregistrée.");
  revalidatePath(`/courses/${text(formData, "courseId")}`);
}

export async function enrollAllLearners(formData: FormData): Promise<void> {
  const user = await requireUser("course:manage");
  const supabase = await createClient();
  const courseId = text(formData, "courseId");
  const { data: learners } = await supabase.from("profiles").select("id").eq("role", "learner").returns<{ id: string }[]>();
  if (learners?.length) {
    const { error } = await supabase.from("enrollments").upsert(
      learners.map((l) => ({ organization_id: user.organization.id, course_id: courseId, learner_id: l.id, enrolled_by: user.id })),
      { onConflict: "course_id,learner_id", ignoreDuplicates: true },
    );
    if (error) throw new Error("Les inscriptions n'ont pas pu être enregistrées.");
  }
  revalidatePath(`/courses/${courseId}`);
}

export async function unenrollLearner(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .delete()
    .eq("course_id", text(formData, "courseId"))
    .eq("learner_id", text(formData, "learnerId"))
    .select("id");
  assertChanged(error, data, "La désinscription n'a pas pu être enregistrée.");
  revalidatePath(`/courses/${text(formData, "courseId")}`);
}
