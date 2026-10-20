import { toCsv } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { formatFamilyFirst } from "@/lib/learner-search";
import { getCurrentUser } from "@/lib/session";
import { formatDateTimeFr, STATUS_LABELS } from "@/lib/tracking";
import { loadTracking } from "@/lib/tracking-data";

// Export CSV du suivi de progression : une ligne par apprenant et par parcours publié.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });
  if (!can(user.role, "reports:export")) return Response.json({ error: "Accès refusé." }, { status: 403 });

  const { rows } = await loadTracking();
  const csv = toCsv(
    [
      "Apprenant", "Parcours", "Statut", "Progression (%)", "Contenus terminés", "Contenus au total",
      "Quiz réussis", "Quiz au total", "Score moyen aux quiz (%)", "Tentatives de quiz",
      "Temps passé (minutes)", "Première activité", "Dernière activité", "Date de fin",
    ],
    rows.map(({ learner, course, tracking: t }) => [
      formatFamilyFirst(learner.fullName), course.title, STATUS_LABELS[t.status], t.percent, t.doneContents, t.totalContents,
      t.passedQuizzes, t.totalQuizzes, t.averageBestScore, t.attemptsCount,
      Math.round(t.timeSeconds / 60), t.startedAt ? formatDateTimeFr(t.startedAt) : null,
      t.lastActivityAt ? formatDateTimeFr(t.lastActivityAt) : null, t.completedAt ? formatDateTimeFr(t.completedAt) : null,
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="suivi-progression-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
