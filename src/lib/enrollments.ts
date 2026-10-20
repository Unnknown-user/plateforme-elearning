// Lecture des inscriptions d'un parcours (côté serveur, personnel uniquement).
// Les droits sont appliqués par la base : seul le personnel de l'organisme voit ces données.
import { createClient } from "@/lib/supabase/server";

export type EnrollmentLearner = { id: string; fullName: string };
export type GroupSummary = { id: string; name: string; memberCount: number };
export type EnrollmentPanelData = {
  /** Inscrits individuellement (désinscriptibles ici). */
  enrolled: EnrollmentLearner[];
  /** Groupes inscrits au parcours, avec leurs membres (désinscriptibles en retirant le groupe). */
  groups: (GroupSummary & { members: EnrollmentLearner[] })[];
  /** Apprenants sans aucun accès (ni individuel, ni par groupe) : ceux qu'on peut encore inscrire. */
  available: EnrollmentLearner[];
  /** Groupes pas encore inscrits à ce parcours. */
  availableGroups: GroupSummary[];
};

type GroupRow = { id: string; name: string; group_members: { learner_id: string }[] };

export async function getEnrollmentPanel(courseId: string): Promise<EnrollmentPanelData> {
  const supabase = await createClient();
  const [learners, enrollments, groups, groupEnrollments] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name").returns<{ id: string; full_name: string }[]>(),
    supabase.from("enrollments").select("learner_id").eq("course_id", courseId).returns<{ learner_id: string }[]>(),
    supabase.from("groups").select("id, name, group_members(learner_id)").order("name").returns<GroupRow[]>(),
    supabase.from("group_enrollments").select("group_id").eq("course_id", courseId).returns<{ group_id: string }[]>(),
  ]);

  const all = (learners.data ?? []).map((l) => ({ id: l.id, fullName: l.full_name }));
  const byId = new Map(all.map((l) => [l.id, l]));
  const directIds = new Set((enrollments.data ?? []).map((e) => e.learner_id));
  const enrolledGroupIds = new Set((groupEnrollments.data ?? []).map((g) => g.group_id));

  const summary = (g: GroupRow): GroupSummary => ({ id: g.id, name: g.name, memberCount: g.group_members.length });
  const enrolledGroups = (groups.data ?? []).filter((g) => enrolledGroupIds.has(g.id));
  const viaGroupIds = new Set(enrolledGroups.flatMap((g) => g.group_members.map((m) => m.learner_id)));

  return {
    enrolled: all.filter((l) => directIds.has(l.id)),
    groups: enrolledGroups.map((g) => ({
      ...summary(g),
      members: g.group_members.flatMap((m) => byId.get(m.learner_id) ?? []),
    })),
    available: all.filter((l) => !directIds.has(l.id) && !viaGroupIds.has(l.id)),
    availableGroups: (groups.data ?? []).filter((g) => !enrolledGroupIds.has(g.id)).map(summary),
  };
}
