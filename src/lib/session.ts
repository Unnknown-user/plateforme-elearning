// Récupère la personne connectée, son rôle et son organisme (côté serveur uniquement).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, isRole, type Action, type Role } from "@/lib/permissions";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organization: { id: string; name: string; logoUrl: string | null; primaryColor: string };
};

type ProfileRow = {
  full_name: string;
  role: string;
  organizations: { id: string; name: string; logo_url: string | null; primary_color: string } | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Les règles d'isolation de la base garantissent qu'on ne reçoit que SON organisme.
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role, organizations(id, name, logo_url, primary_color)")
    .eq("id", user.id)
    .single<ProfileRow>();
  if (!data || !data.organizations || !isRole(data.role)) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: data.full_name,
    role: data.role,
    organization: {
      id: data.organizations.id,
      name: data.organizations.name,
      logoUrl: data.organizations.logo_url,
      primaryColor: data.organizations.primary_color,
    },
  };
}

/** Pour les pages protégées : exige d'être connecté, et d'avoir le droit demandé. */
export async function requireUser(action?: Action): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (action && !can(user.role, action)) redirect("/dashboard");
  return user;
}
