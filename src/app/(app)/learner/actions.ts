"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";

// Marquer un contenu comme terminé (ou annuler). La base vérifie que c'est bien un apprenant
// et que le contenu appartient à un parcours publié de son organisme.
export async function toggleContent(formData: FormData): Promise<void> {
  await requireUser("course:take");
  const supabase = await createClient();
  await supabase.rpc("mark_content_done", {
    p_content_id: String(formData.get("contentId") ?? ""),
    p_done: formData.get("done") === "true",
  });
  revalidatePath("/", "layout");
}

// Temps passé : appelée par le suivi de présence (toutes les ~30 s de présence réelle à l'écran).
// La base plafonne chaque envoi au temps réellement écoulé.
export async function trackTime(courseId: string, seconds: number): Promise<void> {
  await requireUser("course:take");
  const supabase = await createClient();
  await supabase.rpc("track_course_time", { p_course_id: courseId, p_seconds: Math.max(0, Math.min(60, Math.round(seconds))) });
}
