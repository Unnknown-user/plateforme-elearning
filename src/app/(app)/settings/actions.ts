"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { LOGO_EXTENSIONS, validateBranding, validateLegal, validateLogo } from "@/lib/branding";

export type BrandingState = { status: "idle" | "success" | "error"; message: string | null };

export async function updateBranding(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  // Droit vérifié côté serveur ; la base le re-vérifie (règles RLS) en plus.
  const user = await requireUser("organization:manage");

  const parsed = validateBranding({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? ""),
  });
  if (!parsed.ok) return { status: "error", message: parsed.error };

  const legal = validateLegal({
    activityNumber: String(formData.get("activityNumber") ?? ""),
    signatoryName: String(formData.get("signatoryName") ?? ""),
    signatoryTitle: String(formData.get("signatoryTitle") ?? ""),
  });
  if (!legal.ok) return { status: "error", message: legal.error };

  const supabase = await createClient();
  let logoUrl: string | undefined;

  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const problem = validateLogo(file);
    if (problem) return { status: "error", message: problem };

    // Le dossier porte l'identifiant de l'organisme : la base refuse tout envoi ailleurs.
    const path = `${user.organization.id}/logo-${crypto.randomUUID()}.${LOGO_EXTENSIONS[file.type]}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { contentType: file.type });
    if (error) return { status: "error", message: "Le logo n'a pas pu être envoyé. Réessayez." };
    logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
  }
  // Un nouveau logo l'emporte ; sinon la case « Retirer le logo » remet l'avatar à initiales.
  const removeLogo = !logoUrl && formData.get("removeLogo") === "on";

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: parsed.value.name,
      primary_color: parsed.value.color,
      activity_number: legal.value.activityNumber,
      signatory_name: legal.value.signatoryName,
      signatory_title: legal.value.signatoryTitle,
      ...(logoUrl ? { logo_url: logoUrl } : removeLogo ? { logo_url: null } : {}),
    })
    .eq("id", user.organization.id)
    .select("id");
  if (error || !data?.length) {
    return { status: "error", message: "Les modifications n'ont pas pu être enregistrées." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Modifications enregistrées." };
}
