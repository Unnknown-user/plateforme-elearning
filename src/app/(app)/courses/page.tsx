import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("course:manage");
  return (
    <section>
      <h1 className="text-2xl font-semibold">Mes parcours</h1>
      <p className="mt-2 text-zinc-600">Bientôt : création et gestion des parcours (étape 4).</p>
    </section>
  );
}
