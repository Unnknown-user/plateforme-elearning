// Lecture des groupes d'apprenants (côté serveur, personnel uniquement ; la base refuse tout autre accès).
import { createClient } from "@/lib/supabase/server";
import type { EnrollmentLearner } from "@/lib/enrollments";

export type GroupListItem = { id: string; name: string; memberCount: number; courseCount: number };
export type GroupDetail = {
  id: string;
  name: string;
  members: EnrollmentLearner[];
  /** Apprenants de l'organisme pas encore dans ce groupe. */
  candidates: EnrollmentLearner[];
  courses: { id: string; title: string; status: "draft" | "published" }[];
};

type ListRow = { id: string; name: string; group_members: { learner_id: string }[]; group_enrollments: { course_id: string }[] };
type DetailRow = {
  id: string;
  name: string;
  group_members: { learner_id: string }[];
  group_enrollments: { courses: { id: string; title: string; status: "draft" | "published" } | null }[];
};

export async function listGroups(): Promise<GroupListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, group_members(learner_id), group_enrollments(course_id)")
    .order("name")
    .returns<ListRow[]>();
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g.group_members.length,
    courseCount: g.group_enrollments.length,
  }));
}

export async function getGroup(id: string): Promise<GroupDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [group, learners] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, group_members(learner_id), group_enrollments(courses(id, title, status))")
      .eq("id", id)
      .maybeSingle<DetailRow>(),
    supabase.from("profiles").select("id, full_name").eq("role", "learner").returns<{ id: string; full_name: string }[]>(),
  ]);
  if (!group.data) return null;

  const all = (learners.data ?? []).map((l) => ({ id: l.id, fullName: l.full_name }));
  const memberIds = new Set(group.data.group_members.map((m) => m.learner_id));
  return {
    id: group.data.id,
    name: group.data.name,
    members: all.filter((l) => memberIds.has(l.id)),
    candidates: all.filter((l) => !memberIds.has(l.id)),
    courses: group.data.group_enrollments.flatMap((e) => (e.courses ? [e.courses] : [])),
  };
}
