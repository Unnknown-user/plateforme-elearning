import { Users } from "lucide-react";
import { Card, PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/course-ui";
import { initials } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";

const AVATAR_COLORS = ["#7c3aed", "#059669", "#d97706", "#db2777", "#0891b2", "#4f46e5"];

export default async function LearnersPage() {
  await requireUser("learners:view");
  const supabase = await createClient();
  // La base ne renvoie que les membres de l'organisme de la personne connectée.
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "learner")
    .order("full_name")
    .returns<{ id: string; full_name: string }[]>();
  const learners = data ?? [];

  return (
    <>
      <PageHeader title="Apprenants et suivi" description="Les personnes inscrites sur la plateforme de votre organisme." />
      <div className="mb-6 max-w-xs">
        <StatCard tone="brand" icon={<Users className="h-6 w-6" aria-hidden />} label="Apprenants" value={learners.length} />
      </div>
      <Card className="p-0">
        <ul className="divide-y divide-zinc-100">
          {learners.map((learner, i) => (
            <li key={learner.id} className="flex items-center gap-4 p-4">
              <span
                aria-hidden
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
              >
                {initials(learner.full_name)}
              </span>
              <span className="font-medium text-zinc-900">{learner.full_name}</span>
            </li>
          ))}
          {learners.length === 0 && <li className="p-6 text-center text-zinc-600">Aucun apprenant pour le moment.</li>}
        </ul>
      </Card>
      <p className="mt-4 text-sm text-zinc-600">
        Bientôt : progression, temps passé, résultats aux quiz, exports et attestations (étape 6).
      </p>
    </>
  );
}
