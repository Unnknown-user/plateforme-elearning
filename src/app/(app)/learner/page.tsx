import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("course:take");
  return (
    <section>
      <h1 className="text-2xl font-semibold">Mes formations</h1>
      <p className="mt-2 text-zinc-600">Bientôt : tes parcours et tes quiz (étapes 4 et 5).</p>
    </section>
  );
}
