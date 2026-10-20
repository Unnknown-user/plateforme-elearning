import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, UserMinus } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { LearnerPicker } from "@/components/learner-picker";
import { StatusBadge } from "@/components/course-ui";
import { Card, PageHeader } from "@/components/page-header";
import { getGroup } from "@/lib/groups";
import { formatFamilyFirst, sortByFamilyName } from "@/lib/learner-search";
import { requireUser } from "@/lib/session";
import { addMembers, deleteGroup, removeMember } from "../actions";
import { RenameGroupForm } from "../group-forms";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("learners:view");
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) notFound();

  return (
    <>
      <Link href="/groups" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Tous les groupes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={group.name} description="Les membres accèdent aux parcours auxquels ce groupe est inscrit." />
        <form action={deleteGroup}>
          <input type="hidden" name="groupId" value={group.id} />
          <ConfirmButton
            message={`Supprimer le groupe « ${group.name} » ? Ses membres perdent l'accès aux parcours reçus via ce groupe (sauf inscription individuelle) ; leurs résultats sont conservés.`}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Supprimer le groupe
          </ConfirmButton>
        </form>
      </div>

      <Card className="mb-6">
        <RenameGroupForm groupId={group.id} name={group.name} />
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Membres ({group.members.length})</h2>
        {group.members.length === 0 ? (
          <p className="mb-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">Aucun membre pour le moment.</p>
        ) : (
          <ul className="mb-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {sortByFamilyName(group.members).map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="font-medium text-zinc-900">{formatFamilyFirst(member.fullName)}</span>
                <form action={removeMember}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="learnerId" value={member.id} />
                  <ConfirmButton
                    message={`Retirer ${member.fullName} du groupe ? Elle ou il perd l'accès aux parcours reçus via ce groupe (sauf inscription individuelle) ; ses résultats sont conservés.`}
                    title={`Retirer ${member.fullName} du groupe`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-zinc-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <UserMinus className="h-4 w-4" aria-hidden /> Retirer
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        {group.candidates.length > 0 ? (
          <div className="max-w-xl">
            <LearnerPicker
              action={addMembers}
              fields={{ groupId: group.id }}
              learners={group.candidates}
              title="Ajouter des apprenants au groupe"
              submitLabel="Ajouter"
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Tous les apprenants de l&apos;organisme sont déjà dans ce groupe.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">Parcours auxquels ce groupe est inscrit ({group.courses.length})</h2>
        <p className="mb-3 text-sm text-zinc-600">Pour inscrire le groupe à un parcours, ouvrez le parcours : bloc « Inscriptions ».</p>
        {group.courses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">Ce groupe n&apos;est inscrit à aucun parcours.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {group.courses.map((course) => (
              <li key={course.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <Link href={`/courses/${course.id}`} className="font-medium text-zinc-900 hover:underline">
                  {course.title}
                </Link>
                <StatusBadge status={course.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
