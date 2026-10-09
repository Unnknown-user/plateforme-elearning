import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("learners:view");
  return (
    <section>
      <h1 className="text-2xl font-semibold">Apprenants et suivi</h1>
      <p className="mt-2 text-zinc-600">Bientôt : suivi de progression et traces Qualiopi (étape 6).</p>
    </section>
  );
}
