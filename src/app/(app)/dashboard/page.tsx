import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

// Aiguillage : chaque rôle arrive sur sa propre page d'accueil.
export default async function DashboardPage() {
  const user = await requireUser();
  redirect(homePathFor(user.role));
}
