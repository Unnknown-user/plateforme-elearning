import Link from "next/link";
import { BookOpen, UsersRound } from "lucide-react";
import { Card, PageHeader } from "@/components/page-header";
import { listGroups } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { CreateGroupForm } from "./group-forms";

export default async function GroupsPage() {
  await requireUser("learners:view");
  const groups = await listGroups();

  return (
    <>
      <PageHeader
        title="Groupes d'apprenants"
        description="Réunissez des apprenants (promotion, équipe...) pour les inscrire à un parcours d'un seul geste."
      />
      <Card className="mb-6">
        <CreateGroupForm />
      </Card>

      {groups.length === 0 ? (
        <Card className="py-14 text-center text-zinc-600">Aucun groupe pour le moment. Créez le premier !</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="block rounded-xl focus-visible:outline-2">
              <Card className="h-full transition-shadow hover:shadow-md">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                  <UsersRound className="h-5 w-5 text-[var(--brand)]" aria-hidden /> {group.name}
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {group.memberCount} apprenant{group.memberCount > 1 ? "s" : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-600">
                  <BookOpen className="h-4 w-4" aria-hidden /> {group.courseCount} parcours
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
