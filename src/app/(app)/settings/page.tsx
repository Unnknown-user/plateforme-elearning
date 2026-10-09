import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("organization:manage");
  return (
    <section>
      <h1 className="text-2xl font-semibold">Paramètres de l&apos;organisme</h1>
      <p className="mt-2 text-zinc-600">Bientôt : nom, logo et couleurs de l&apos;organisme (étape 3).</p>
    </section>
  );
}
