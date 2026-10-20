import { UserMinus, Users } from "lucide-react";
import { Card } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { EnrollSearch } from "@/components/enroll-search";
import { enrollAllLearners, unenrollLearner } from "@/app/(app)/courses/enrollment-actions";
import { formatFamilyFirst, sortByFamilyName } from "@/lib/learner-search";
import type { EnrollmentPanelData } from "@/lib/enrollments";

/** Inscriptions d'un parcours, côté personnel : qui peut le suivre. */
export function EnrollmentPanel({ courseId, published, data }: { courseId: string; published: boolean; data: EnrollmentPanelData }) {
  const { enrolled, available } = data;
  return (
    <Card className="mb-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-zinc-900">
        <Users className="h-5 w-5 text-zinc-600" aria-hidden /> Inscriptions ({enrolled.length})
      </h2>
      <p className="mb-4 text-sm text-zinc-600">
        Seuls les apprenants inscrits voient ce parcours.
        {!published && " Il est encore en brouillon : ils le verront une fois publié."}
      </p>

      {enrolled.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">Aucun apprenant inscrit pour le moment.</p>
      ) : (
        <ul className="mb-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {sortByFamilyName(enrolled).map((learner) => (
            <li key={learner.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span className="font-medium text-zinc-900">{formatFamilyFirst(learner.fullName)}</span>
              <form action={unenrollLearner}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="learnerId" value={learner.id} />
                <ConfirmButton
                  message={`Désinscrire ${learner.fullName} ? Elle ou il ne verra plus ce parcours ; ses résultats et son temps passé sont conservés.`}
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

      {available.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xl">
            <EnrollSearch courseId={courseId} learners={available} />
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
