// Lecture des parcours depuis la base (côté serveur). Les règles d'isolation et de visibilité
// (un apprenant ne voit que les parcours publiés) sont appliquées par la base elle-même.
import { createClient } from "@/lib/supabase/server";

export type CourseStatus = "draft" | "published";
export type ContentType = "text" | "video" | "pdf";

export type ContentRow = {
  id: string;
  type: ContentType;
  title: string;
  body: string | null;
  url: string | null;
  file_path: string | null;
  position: number;
};
export type ModuleRow = { id: string; title: string; position: number; contents: ContentRow[] };
export type CourseSummary = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  status: CourseStatus;
  created_at: string;
  modules: { id: string }[];
};
export type CourseDetail = Omit<CourseSummary, "modules"> & { objectives: string; modules: ModuleRow[] };

export async function listCourses(): Promise<CourseSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title, description, duration_minutes, status, created_at, modules(id)")
    .order("created_at", { ascending: false })
    .returns<CourseSummary[]>();
  return data ?? [];
}

export async function getCourse(id: string): Promise<CourseDetail | null> {
  // Un identifiant mal formé ferait échouer la requête : on le traite comme « introuvable ».
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(
      "id, title, description, objectives, duration_minutes, status, created_at, modules(id, title, position, contents(id, type, title, body, url, file_path, position))",
    )
    .eq("id", id)
    .maybeSingle<CourseDetail>();
  if (!data) return null;
  data.modules.sort((a, b) => a.position - b.position);
  data.modules.forEach((m) => m.contents.sort((a, b) => a.position - b.position));
  return data;
}

/** Liens temporaires (1 h) vers les PDF d'un parcours, indexés par chemin de fichier. */
export async function signedPdfUrls(course: CourseDetail): Promise<Record<string, string>> {
  const paths = course.modules.flatMap((m) => m.contents.flatMap((c) => (c.file_path ? [c.file_path] : [])));
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from("course-files").createSignedUrls(paths, 3600);
  const urls: Record<string, string> = {};
  data?.forEach((item) => {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  });
  return urls;
}
