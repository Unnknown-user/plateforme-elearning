"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { assertChanged } from "@/lib/action-error";
import { validateGroupName } from "@/lib/groups-rules";

export type GroupFormState = { error: string | null; saved?: boolean };

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

// Les groupes relèvent du suivi des apprenants (droit « learners:view » : administrateur et formateur).
// La base le re-vérifie (RLS) : les groupes sont invisibles et intouchables pour un apprenant.

export async function createGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireUser("learners:view");
  const name = validateGroupName(text(formData, "name"));
  if (!name.ok) return { error: name.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .insert({ organization_id: user.organization.id, name: name.value })
    .select("id")
    .single<{ id: string }>();
  // 23505 = nom déjà utilisé (index unique insensible à la casse).
  if (error?.code === "23505") return { error: "Un groupe porte déjà ce nom." };
  if (error || !data) return { error: "Le groupe n'a pas pu être créé." };

  revalidatePath("/groups");
  redirect(`/groups/${data.id}`);
}

export async function renameGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  await requireUser("learners:view");
  const name = validateGroupName(text(formData, "name"));
  if (!name.ok) return { error: name.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").update({ name: name.value }).eq("id", text(formData, "groupId")).select("id");
  if (error?.code === "23505") return { error: "Un groupe porte déjà ce nom." };
  if (error || !data?.length) return { error: "Le groupe n'a pas pu être renommé." };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export async function deleteGroup(formData: FormData): Promise<void> {
  await requireUser("learners:view");
  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").delete().eq("id", text(formData, "groupId")).select("id");
  assertChanged(error, data, "Le groupe n'a pas pu être supprimé.");
  revalidatePath("/", "layout");
  redirect("/groups");
}

export async function addMembers(formData: FormData): Promise<void> {
  const user = await requireUser("learners:view");
  const groupId = text(formData, "groupId");
  const learnerIds = [...new Set(formData.getAll("learnerId").map(String))];
  if (learnerIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("group_members").upsert(
    learnerIds.map((learnerId) => ({ organization_id: user.organization.id, group_id: groupId, learner_id: learnerId })),
    { onConflict: "group_id,learner_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Les apprenants n'ont pas pu être ajoutés au groupe.");
  revalidatePath("/", "layout");
}

export async function removeMember(formData: FormData): Promise<void> {
  await requireUser("learners:view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", text(formData, "groupId"))
    .eq("learner_id", text(formData, "learnerId"))
    .select("learner_id");
  assertChanged(error, data, "L'apprenant n'a pas pu être retiré du groupe.");
  revalidatePath("/", "layout");
}
