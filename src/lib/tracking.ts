// Calcul du suivi de progression d'un apprenant sur un parcours (logique pure, testée dans tracking.test.ts).
//
// Règles :
//  * Un parcours comporte des « éléments » : chaque contenu à terminer + chaque quiz à réussir.
//  * Contenu terminé = marqué comme terminé par l'apprenant. Quiz réussi = au moins une tentative réussie.
//  * Progression (%) = éléments faits / éléments total. Terminé = 100 %.
//  * Les traces qui ne correspondent plus à un élément du parcours (contenu supprimé) sont ignorées.

export type TrackingStatus = "not_started" | "in_progress" | "completed";

export const STATUS_LABELS: Record<TrackingStatus, string> = {
  not_started: "Non commencé",
  in_progress: "En cours",
  completed: "Terminé",
};

export type TrackingInput = {
  structure: { contentIds: string[]; quizIds: string[] };
  completions: { contentId: string; completedAt: string }[];
  attempts: { quizId: string; scorePercent: number; passed: boolean; createdAt: string }[];
  timeSeconds: number;
  timeFirstSeenAt: string | null;
  timeLastSeenAt: string | null;
};

export type CourseTracking = {
  status: TrackingStatus;
  percent: number;
  doneContents: number;
  totalContents: number;
  passedQuizzes: number;
  totalQuizzes: number;
  /** Moyenne, sur les quiz tentés, du meilleur score de chaque quiz (null si aucune tentative). */
  averageBestScore: number | null;
  attemptsCount: number;
  timeSeconds: number;
  startedAt: string | null;
  lastActivityAt: string | null;
  completedAt: string | null;
};

const time = (iso: string) => Date.parse(iso);
const earliest = (dates: string[]) => (dates.length ? dates.reduce((a, b) => (time(a) <= time(b) ? a : b)) : null);
const latest = (dates: string[]) => (dates.length ? dates.reduce((a, b) => (time(a) >= time(b) ? a : b)) : null);

export function buildTracking(input: TrackingInput): CourseTracking {
  const contentSet = new Set(input.structure.contentIds);
  const quizSet = new Set(input.structure.quizIds);

  const completions = input.completions.filter((c) => contentSet.has(c.contentId));
  // Un même contenu peut apparaître une seule fois (clé primaire en base), on dédoublonne par sécurité.
  const doneContentIds = new Set(completions.map((c) => c.contentId));
  const attempts = input.attempts.filter((a) => quizSet.has(a.quizId));

  const passedByQuiz = new Map<string, string>(); // quiz -> date de la 1re tentative réussie
  const bestByQuiz = new Map<string, number>();
  for (const attempt of attempts) {
    bestByQuiz.set(attempt.quizId, Math.max(bestByQuiz.get(attempt.quizId) ?? 0, attempt.scorePercent));
    if (attempt.passed) {
      const previous = passedByQuiz.get(attempt.quizId);
      if (!previous || time(attempt.createdAt) < time(previous)) passedByQuiz.set(attempt.quizId, attempt.createdAt);
    }
  }

  const totalContents = contentSet.size;
  const totalQuizzes = quizSet.size;
  const totalItems = totalContents + totalQuizzes;
  const doneItems = doneContentIds.size + passedByQuiz.size;

  const activityDates = [
    ...completions.map((c) => c.completedAt),
    ...attempts.map((a) => a.createdAt),
    ...(input.timeFirstSeenAt ? [input.timeFirstSeenAt] : []),
  ];
  const hasActivity = activityDates.length > 0 || input.timeSeconds > 0;

  const complete = totalItems > 0 && doneItems === totalItems;
  const status: TrackingStatus = complete ? "completed" : hasActivity ? "in_progress" : "not_started";

  const bestScores = [...bestByQuiz.values()];
  const doneDates = [
    ...completions.map((c) => c.completedAt),
    ...[...passedByQuiz.values()],
  ];

  return {
    status,
    percent: totalItems === 0 ? 0 : Math.round((doneItems * 100) / totalItems),
    doneContents: doneContentIds.size,
    totalContents,
    passedQuizzes: passedByQuiz.size,
    totalQuizzes,
    averageBestScore: bestScores.length ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length) : null,
    attemptsCount: attempts.length,
    timeSeconds: input.timeSeconds,
    startedAt: earliest(activityDates),
    lastActivityAt: latest([...activityDates, ...(input.timeLastSeenAt ? [input.timeLastSeenAt] : [])]),
    completedAt: complete ? latest(doneDates) : null,
  };
}

/** 0 → « 0 min », 45 → « moins d'1 min », 3900 → « 1 h 05 », 5400 → « 1 h 30 ». */
export function formatSeconds(seconds: number): string {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return "moins d'1 min";
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** Date au format français (« 09/10/2026 »), ou tiret si absente. */
export function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" }).format(new Date(iso));
}

/** Date et heure au format français (« 09/10/2026 14:05 »), ou tiret si absente. */
export function formatDateTimeFr(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })
    .format(new Date(iso))
    .replace(",", "");
}

/** « Léa Fontaine » → « lea-fontaine » : pour des noms de fichiers sûrs. */
export function slugify(text: string, maxLength = 40): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "") || "document";
}
