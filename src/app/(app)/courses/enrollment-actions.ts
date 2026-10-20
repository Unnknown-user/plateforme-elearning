"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { assertChanged } from "@/lib/action-error";

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

// Toutes les actions exigent le droit « gérer les parcours » ; la base le re-vérifie (RLS) et refuse
// d'inscrire un compte qui n'est pas apprenant ou qui appartient à un autre organisme.

export async function enrollLearners(formData: FormData): Promise<void> {
  const user = await requireUser("course:manage");
  const supabase = await createClient();
  const courseId = text(formData, "courseId");
  const learnerIds = [...new Set(formData.getAll("learnerId").map(String))];
  if (learnerIds.length === 0) return;
  // « ignoreDuplicates » : inscrire deux fois la même personne ne fait rien (pas d'erreur).
  const { error } = await supabase.from("enrollments").upsert(
    learnerIds.map((learnerId) => ({ organization_id: user.organization.id, course_id: courseId, learner_id: learnerId, enrolled_by: user.id })),
    { onConflict: "course_id,learner_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Les inscriptions n'ont pas pu être enregistrées.");
  revalidatePath(`/courses/${courseId}`);
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

// Inscription d'un groupe entier : tous ses membres (présents et futurs) accèdent au parcours.
export async function enrollGroup(formData: FormData): Promise<void> {
  const user = await requireUser("course:manage");
  const supabase = await createClient();
  const courseId = text(formData, "courseId");
  const { error } = await supabase.from("group_enrollments").upsert(
    { organization_id: user.organization.id, group_id: text(formData, "groupId"), course_id: courseId, enrolled_by: user.id },
    { onConflict: "group_id,course_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Le groupe n'a pas pu être inscrit.");
  revalidatePath(`/courses/${courseId}`);
}

export async function unenrollGroup(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  const courseId = text(formData, "courseId");
  const { data, error } = await supabase
    .from("group_enrollments")
    .delete()
    .eq("course_id", courseId)
    .eq("group_id", text(formData, "groupId"))
    .select("group_id");
  assertChanged(error, data, "Le groupe n'a pas pu être désinscrit.");
  revalidatePath(`/courses/${courseId}`);
}
