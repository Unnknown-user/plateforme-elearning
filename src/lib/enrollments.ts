// Lecture des inscriptions d'un parcours (côté serveur, personnel uniquement).
// Les droits sont appliqués par la base : seul le personnel de l'organisme voit ces données.
import { createClient } from "@/lib/supabase/server";

export type EnrollmentLearner = { id: string; fullName: string };
export type EnrollmentPanelData = { enrolled: EnrollmentLearner[]; available: EnrollmentLearner[] };

export async function getEnrollmentPanel(courseId: string): Promise<EnrollmentPanelData> {
  const supabase = await createClient();
  const [learners, enrollments] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name").returns<{ id: string; full_name: string }[]>(),
    supabase.from("enrollments").select("learner_id").eq("course_id", courseId).returns<{ learner_id: string }[]>(),
  ]);
  const enrolledIds = new Set((enrollments.data ?? []).map((e) => e.learner_id));
  const all = (learners.data ?? []).map((l) => ({ id: l.id, fullName: l.full_name }));
  return { enrolled: all.filter((l) => enrolledIds.has(l.id)), available: all.filter((l) => !enrolledIds.has(l.id)) };
}
