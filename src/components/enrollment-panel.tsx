import { UserMinus, Users, UsersRound } from "lucide-react";
import { Card } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { LearnerPicker } from "@/components/learner-picker";
import { enrollAllLearners, enrollGroup, enrollLearners, unenrollGroup, unenrollLearner } from "@/app/(app)/courses/enrollment-actions";
import { formatFamilyFirst, sortByFamilyName } from "@/lib/learner-search";
import type { EnrollmentPanelData } from "@/lib/enrollments";

const subtitle = "mb-2 mt-5 text-sm font-semibold text-zinc-900";

/** Inscriptions d'un parcours, côté personnel : qui peut le suivre (individuellement ou par groupe). */
export function EnrollmentPanel({ courseId, published, data }: { courseId: string; published: boolean; data: EnrollmentPanelData }) {
  const { enrolled, groups, available, availableGroups } = data;
  const viaGroups = new Set(groups.flatMap((g) => g.members.map((m) => m.id))).size;
  const total = new Set([...enrolled.map((l) => l.id), ...groups.flatMap((g) => g.members.map((m) => m.id))]).size;

  return (
    <Card className="mb-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-zinc-900">
        <Users className="h-5 w-5 text-zinc-600" aria-hidden /> Inscriptions ({total})
      </h2>
      <p className="text-sm text-zinc-600">
        Seuls les apprenants inscrits, seuls ou via un groupe, voient ce parcours.
        {!published && " Il est encore en brouillon : ils le verront une fois publié."}
      </p>

      <h3 className={subtitle}>Groupes inscrits ({groups.length})</h3>
      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600">Aucun groupe inscrit à ce parcours.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span>
                <span className="font-medium text-zinc-900">{group.name}</span>{" "}
                <span className="text-zinc-600">
                  · {group.memberCount} apprenant{group.memberCount > 1 ? "s" : ""}
                </span>
              </span>
              <form action={unenrollGroup}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="groupId" value={group.id} />
                <ConfirmButton
                  message={`Désinscrire le groupe « ${group.name} » ? Ses membres perdent l'accès à ce parcours (sauf inscription individuelle) ; leurs résultats sont conservés.`}
                  title={`Désinscrire le groupe ${group.name}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-zinc-600 hover:bg-red-50 hover:text-red-700"
                >
                  <UserMinus className="h-4 w-4" aria-hidden /> Désinscrire
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      {availableGroups.length > 0 && (
        <form action={enrollGroup} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <label className="text-sm font-medium text-zinc-900">
            Inscrire un groupe
            <select name="groupId" required className="mt-1 block rounded-lg border border-zinc-400 bg-white p-2 text-sm text-zinc-900">
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.memberCount})
                </option>
              ))}
            </select>
          </label>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)]">
            <UsersRound className="h-4 w-4" aria-hidden /> Inscrire le groupe
          </button>
        </form>
      )}

      <h3 className={subtitle}>Inscriptions individuelles ({enrolled.length})</h3>
      {enrolled.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-600">Aucun apprenant inscrit individuellement.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {sortByFamilyName(enrolled).map((learner) => (
            <li key={learner.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span className="font-medium text-zinc-900">{formatFamilyFirst(learner.fullName)}</span>
              <form action={unenrollLearner}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="learnerId" value={learner.id} />
                <ConfirmButton
                  message={`Désinscrire ${learner.fullName} ? Elle ou il ne verra plus ce parcours (sauf via un groupe) ; ses résultats et son temps passé sont conservés.`}
                  title={`Désinscrire ${learner.fullName}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-zinc-600 hover:bg-red-50 hover:text-red-700"
                >
                  <UserMinus className="h-4 w-4" aria-hidden /> Désinscrire
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      {viaGroups > 0 && (
        <p className="mt-2 text-xs text-zinc-600">
          {viaGroups} apprenant{viaGroups > 1 ? "s" : ""} accède{viaGroups > 1 ? "nt" : ""} aussi au parcours via un groupe.
        </p>
      )}

      {available.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xl">
            <LearnerPicker
              action={enrollLearners}
              fields={{ courseId }}
              learners={available}
              title="Inscrire des apprenants"
              submitLabel="Inscrire"
            />
          </div>
          <form action={enrollAllLearners}>
            <input type="hidden" name="courseId" value={courseId} />
            <ConfirmButton
              message={`Inscrire les ${available.length} apprenant${available.length > 1 ? "s" : ""} restant${available.length > 1 ? "s" : ""} à ce parcours ?`}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Inscrire tous les apprenants ({available.length})
            </ConfirmButton>
          </form>
        </div>
      )}
    </Card>
  );
}
