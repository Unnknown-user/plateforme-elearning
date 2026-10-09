"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { validateContent, validateCourse, validatePdf, validateTitle } from "@/lib/content";

export type FormState = { error: string | null; saved?: boolean };

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

// Toutes les actions exigent le droit « gérer les parcours » ; la base le re-vérifie (RLS).

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("course:manage");
  const parsed = validateCourse({
    title: text(formData, "title"),
    description: text(formData, "description"),
    objectives: text(formData, "objectives"),
    duration: text(formData, "duration"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      organization_id: user.organization.id,
      title: parsed.value.title,
      description: parsed.value.description,
      objectives: parsed.value.objectives,
      duration_minutes: parsed.value.durationMinutes,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Le parcours n'a pas pu être créé." };

  revalidatePath("/courses");
  redirect(`/courses/${data.id}`);
}

export async function setCourseStatus(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const courseId = text(formData, "courseId");
  const status = text(formData, "status") === "published" ? "published" : "draft";
  const supabase = await createClient();
  await supabase.from("courses").update({ status }).eq("id", courseId);
  revalidatePath("/", "layout");
}

export async function deleteCourse(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", text(formData, "courseId"));
  revalidatePath("/courses");
  redirect("/courses");
}

export async function addModule(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("course:manage");
  const title = validateTitle(text(formData, "title"), "Le titre du module");
  if (!title.ok) return { error: title.error };
  const courseId = text(formData, "courseId");

  const supabase = await createClient();
  const { count } = await supabase
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);
  const { error } = await supabase.from("modules").insert({
    organization_id: user.organization.id,
    course_id: courseId,
    title: title.value,
    position: (count ?? 0) + 1,
  });
  if (error) return { error: "Le module n'a pas pu être ajouté." };

  revalidatePath(`/courses/${courseId}`);
  return { error: null };
}

export async function deleteModule(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  await supabase.from("modules").delete().eq("id", text(formData, "moduleId"));
  revalidatePath(`/courses/${text(formData, "courseId")}`);
}

export async function addContent(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("course:manage");
  const moduleId = text(formData, "moduleId");
  const courseId = text(formData, "courseId");
  const type = text(formData, "type");
  const supabase = await createClient();

  const { count } = await supabase
    .from("contents")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);
  const base = { organization_id: user.organization.id, module_id: moduleId, position: (count ?? 0) + 1 };

  if (type === "pdf") {
    const title = validateTitle(text(formData, "title"), "Le titre du contenu");
    if (!title.ok) return { error: title.error };
    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "Choisissez un fichier PDF." };
    const problem = validatePdf(file);
    if (problem) return { error: problem };

    // Le dossier porte l'identifiant de l'organisme : la base refuse tout envoi ailleurs.
    const path = `${user.organization.id}/${courseId}/${crypto.randomUUID()}.pdf`;
    const upload = await supabase.storage.from("course-files").upload(path, file, { contentType: "application/pdf" });
    if (upload.error) return { error: "Le PDF n'a pas pu être envoyé." };
    const { error } = await supabase.from("contents").insert({ ...base, type: "pdf", title: title.value, file_path: path });
    if (error) {
      await supabase.storage.from("course-files").remove([path]);
      return { error: "Le contenu n'a pas pu être ajouté." };
    }
  } else {
    const parsed = validateContent({
      type,
      title: text(formData, "title"),
      body: text(formData, "body"),
      url: text(formData, "url"),
    });
    if (!parsed.ok) return { error: parsed.error };
    const row: Record<string, string | number> =
      parsed.value.type === "text"
        ? { ...base, type: "text", title: parsed.value.title, body: parsed.value.body }
        : { ...base, type: "video", title: parsed.value.title, url: parsed.value.url };
    const { error } = await supabase.from("contents").insert(row);
    if (error) return { error: "Le contenu n'a pas pu être ajouté." };
  }

  revalidatePath(`/courses/${courseId}`);
  return { error: null };
}

export async function deleteContent(formData: FormData): Promise<void> {
  await requireUser("course:manage");
  const supabase = await createClient();
  const contentId = text(formData, "contentId");
  const { data } = await supabase.from("contents").select("file_path").eq("id", contentId).maybeSingle<{ file_path: string | null }>();
  await supabase.from("contents").delete().eq("id", contentId);
  if (data?.file_path) await supabase.storage.from("course-files").remove([data.file_path]);
  revalidatePath(`/courses/${text(formData, "courseId")}`);
}

export async function renameModule(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("course:manage");
  const title = validateTitle(text(formData, "title"), "Le titre du module");
  if (!title.ok) return { error: title.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .update({ title: title.value })
    .eq("id", text(formData, "moduleId"))
    .select("id");
  if (error || !data?.length) return { error: "Le module n'a pas pu être renommé." };
  revalidatePath(`/courses/${text(formData, "courseId")}`);
  return { error: null, saved: true };
}

export async function updateContent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("course:manage");
  const contentId = text(formData, "contentId");
  const supabase = await createClient();

  // Le type d'un contenu ne change pas : on le relit en base plutôt que de se fier au formulaire.
  const { data: existing } = await supabase
    .from("contents")
    .select("type")
    .eq("id", contentId)
    .maybeSingle<{ type: string }>();
  if (!existing) return { error: "Contenu introuvable." };

  let changes: Record<string, string>;
  if (existing.type === "pdf") {
    const title = validateTitle(text(formData, "title"), "Le titre du contenu");
    if (!title.ok) return { error: title.error };
    changes = { title: title.value };
  } else {
    const parsed = validateContent({
      type: existing.type,
      title: text(formData, "title"),
      body: text(formData, "body"),
      url: text(formData, "url"),
    });
    if (!parsed.ok) return { error: parsed.error };
    changes =
      parsed.value.type === "text"
        ? { title: parsed.value.title, body: parsed.value.body }
        : { title: parsed.value.title, url: parsed.value.url };
  }

  const { data, error } = await supabase.from("contents").update(changes).eq("id", contentId).select("id");
  if (error || !data?.length) return { error: "Les modifications n'ont pas pu être enregistrées." };
  revalidatePath(`/courses/${text(formData, "courseId")}`);
  return { error: null, saved: true };
}
