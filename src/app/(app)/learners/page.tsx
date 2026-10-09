import { Award, BarChart3, CheckCircle2, ClipboardList, Download, Users } from "lucide-react";
import { ProgressBar, StatCard, TrackingBadge } from "@/components/course-ui";
import { Card, PageHeader } from "@/components/page-header";
import { initials } from "@/lib/branding";
import { formatDateFr, formatSeconds } from "@/lib/tracking";
import { loadTracking } from "@/lib/tracking-data";
import { requireUser } from "@/lib/session";

const AVATAR_COLORS = ["#7c3aed", "#059669", "#d97706", "#db2777", "#0891b2", "#4f46e5"];

export default async function LearnersPage() {
  await requireUser("learners:view");
  // La base ne renvoie que les apprenants et les traces de l'organisme de la personne connectée.
  const { rows, learners, courses } = await loadTracking();

  const completed = rows.filter((r) => r.tracking.status === "completed").length;
  const inProgress = rows.filter((r) => r.tracking.status === "in_progress").length;
  const totalSeconds = rows.reduce((sum, r) => sum + r.tracking.timeSeconds, 0);
  const colorOf = new Map(learners.map((l, i) => [l.id, AVATAR_COLORS[i % AVATAR_COLORS.length]!]));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Apprenants et suivi" description="Progression, temps passé et résultats : les traces de votre organisme." />
        <div className="mb-6 flex flex-wrap gap-2">
          <a
            href="/api/exports/progress"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
          >
            <Download className="h-4 w-4" aria-hidden /> Export du suivi (CSV)
          </a>
          <a
            href="/api/exports/quiz-results"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <ClipboardList className="h-4 w-4" aria-hidden /> Résultats aux quiz (CSV)
          </a>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" icon={<Users className="h-6 w-6" aria-hidden />} label="Apprenants" value={learners.length} />
        <StatCard tone="emerald" icon={<CheckCircle2 className="h-6 w-6" aria-hidden />} label="Parcours terminés" value={completed} />
        <StatCard tone="amber" icon={<BarChart3 className="h-6 w-6" aria-hidden />} label="Parcours en cours" value={inProgress} />
        <StatCard tone="violet" icon={<Award className="h-6 w-6" aria-hidden />} label="Temps total passé" value={formatSeconds(totalSeconds)} />
      </div>

      {rows.length === 0 ? (
        <Card className="py-14 text-center text-zinc-600">
          {courses.length === 0 ? "Aucun parcours publié pour le moment." : "Aucun apprenant pour le moment."}
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Apprenant</th>
                <th className="px-4 py-3 font-medium">Parcours</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="w-44 px-4 py-3 font-medium">Progression</th>
                <th className="px-4 py-3 font-medium">Temps</th>
                <th className="px-4 py-3 font-medium">Quiz</th>
                <th className="px-4 py-3 font-medium">Dernière activité</th>
                <th className="px-4 py-3 font-medium">Attestation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(({ learner, course, tracking: t }) => (
                <tr key={`${learner.id}-${course.id}`} className="align-middle">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden
                        style={{ backgroundColor: colorOf.get(learner.id) }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      >
                        {initials(learner.fullName)}
                      </span>
                      <span className="font-medium text-zinc-900">{learner.fullName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-800">{course.title}</td>
                  <td className="px-4 py-3">
                    <TrackingBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={t.percent} status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatSeconds(t.timeSeconds)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {t.totalQuizzes === 0 ? "—" : `${t.passedQuizzes}/${t.totalQuizzes} réussi${t.passedQuizzes > 1 ? "s" : ""}${t.averageBestScore !== null ? ` · ${t.averageBestScore} %` : ""}`}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatDateFr(t.lastActivityAt)}</td>
                  <td className="px-4 py-3">
                    {t.status === "completed" ? (
                      <a
                        href={`/api/attestation/${course.id}?learner=${learner.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                      >
                        <Award className="h-3.5 w-3.5" aria-hidden /> PDF
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-4 text-sm text-zinc-600">
        Le temps passé mesure la présence active à l&apos;écran : c&apos;est une indication, pas une preuve d&apos;assiduité.
      </p>
    </>
  );
}
