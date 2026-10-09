import { toCsv } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { formatDateTimeFr } from "@/lib/tracking";
import { loadTracking } from "@/lib/tracking-data";

// Export CSV des résultats aux quiz : une ligne par tentative (trace d'évaluation).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });
  if (!can(user.role, "reports:export")) return Response.json({ error: "Accès refusé." }, { status: 403 });

  const { attempts, courses, learners } = await loadTracking();
  const learnerName = new Map(learners.map((l) => [l.id, l.fullName]));
  const quizInfo = new Map(courses.flatMap((c) => c.quizzes.map((q) => [q.id, { quiz: q.title, course: c.title }] as const)));

  const counters = new Map<string, number>();
  const csv = toCsv(
    ["Apprenant", "Parcours", "Quiz", "N° de tentative", "Date et heure", "Score (%)", "Bonnes réponses", "Questions", "Résultat"],
    attempts.map((a) => {
      const key = `${a.learnerId}|${a.quizId}`;
      const number = (counters.get(key) ?? 0) + 1;
      counters.set(key, number);
      const info = quizInfo.get(a.quizId);
      return [
        learnerName.get(a.learnerId) ?? "", info?.course ?? "", info?.quiz ?? "", number,
        formatDateTimeFr(a.createdAt), a.scorePercent, a.points, a.maxPoints, a.passed ? "Réussi" : "Non réussi",
      ];
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resultats-quiz-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
