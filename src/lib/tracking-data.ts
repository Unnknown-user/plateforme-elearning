// Chargement des données de suivi depuis la base (côté serveur), puis calcul via buildTracking.
// Les droits sont appliqués par la base : un apprenant ne reçoit que ses traces, le personnel celles de son organisme.
import { createClient } from "@/lib/supabase/server";
import { buildTracking, type CourseTracking } from "@/lib/tracking";

export type TrackedCourse = {
  id: string;
  title: string;
  durationMinutes: number;
  objectives: string[];
  contentIds: string[];
  quizzes: { id: string; title: string }[];
};
export type TrackedLearner = { id: string; fullName: string };
export type TrackingRow = { learner: TrackedLearner; course: TrackedCourse; tracking: CourseTracking };
export type AttemptDetail = {
  learnerId: string;
  quizId: string;
  scorePercent: number;
  points: number;
  maxPoints: number;
  passed: boolean;
  createdAt: string;
};
export type TrackingData = {
  rows: TrackingRow[];
  attempts: AttemptDetail[];
  courses: TrackedCourse[];
  learners: TrackedLearner[];
};

type CourseRaw = {
  id: string;
  title: string;
  duration_minutes: number;
  objectives: string;
  modules: { id: string; position: number; contents: { id: string; position: number }[] }[];
};

/**
 * learnerIds : restreint à certains apprenants (la vue apprenant passe son propre identifiant).
 * Sans filtre, le personnel obtient tous les apprenants de son organisme.
 */
export async function loadTracking(options: { learnerId?: string; courseId?: string } = {}): Promise<TrackingData> {
  const supabase = await createClient();

  let courseQuery = supabase
    .from("courses")
    .select("id, title, duration_minutes, objectives, modules(id, position, contents(id, position))")
    .eq("status", "published")
    .order("title");
  if (options.courseId) courseQuery = courseQuery.eq("id", options.courseId);
  const { data: courseRows } = await courseQuery.returns<CourseRaw[]>();
  const rawCourses = courseRows ?? [];

  const moduleIds = rawCourses.flatMap((c) => c.modules.map((m) => m.id));
  const { data: quizRows } = moduleIds.length
    ? await supabase.from("quizzes").select("id, title, module_id").in("module_id", moduleIds).returns<{ id: string; title: string; module_id: string }[]>()
    : { data: [] as { id: string; title: string; module_id: string }[] };
  const quizzesByModule = new Map((quizRows ?? []).map((q) => [q.module_id, q]));

  const courses: TrackedCourse[] = rawCourses.map((c) => ({
    id: c.id,
    title: c.title,
    durationMinutes: c.duration_minutes,
    objectives: c.objectives.split("\n").map((l) => l.trim()).filter(Boolean),
    contentIds: c.modules.flatMap((m) => m.contents.map((ct) => ct.id)),
    quizzes: c.modules.flatMap((m) => {
      const quiz = quizzesByModule.get(m.id);
      return quiz ? [{ id: quiz.id, title: quiz.title }] : [];
    }),
  }));

  let learnerQuery = supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name");
  if (options.learnerId) learnerQuery = learnerQuery.eq("id", options.learnerId);
  const { data: learnerRows } = await learnerQuery.returns<{ id: string; full_name: string }[]>();
  const learners = (learnerRows ?? []).map((l) => ({ id: l.id, fullName: l.full_name }));

  const learnerIds = learners.map((l) => l.id);
  const contentIds = courses.flatMap((c) => c.contentIds);
  const quizIds = courses.flatMap((c) => c.quizzes.map((q) => q.id));
  const empty = { data: [] };

  const [completions, times, attempts] = await Promise.all([
    learnerIds.length && contentIds.length
      ? supabase
          .from("content_completions")
          .select("learner_id, content_id, completed_at")
          .in("learner_id", learnerIds)
          .returns<{ learner_id: string; content_id: string; completed_at: string }[]>()
      : empty,
    learnerIds.length
      ? supabase
          .from("course_time")
          .select("learner_id, course_id, seconds, first_seen_at, last_seen_at")
          .in("learner_id", learnerIds)
          .returns<{ learner_id: string; course_id: string; seconds: number; first_seen_at: string; last_seen_at: string }[]>()
      : empty,
    learnerIds.length && quizIds.length
      ? supabase
          .from("quiz_attempts")
          .select("learner_id, quiz_id, score_percent, points, max_points, passed, created_at")
          .in("learner_id", learnerIds)
          .in("quiz_id", quizIds)
          .order("created_at")
          .returns<{ learner_id: string; quiz_id: string; score_percent: number; points: number; max_points: number; passed: boolean; created_at: string }[]>()
      : empty,
  ]);

  const completionRows = completions.data ?? [];
  const timeRows = times.data ?? [];
  const attemptRows = attempts.data ?? [];

  const rows: TrackingRow[] = [];
  for (const learner of learners) {
    for (const course of courses) {
      const time = timeRows.find((t) => t.learner_id === learner.id && t.course_id === course.id);
      rows.push({
        learner,
        course,
        tracking: buildTracking({
          structure: { contentIds: course.contentIds, quizIds: course.quizzes.map((q) => q.id) },
          completions: completionRows
            .filter((c) => c.learner_id === learner.id)
            .map((c) => ({ contentId: c.content_id, completedAt: c.completed_at })),
          attempts: attemptRows
            .filter((a) => a.learner_id === learner.id)
            .map((a) => ({ quizId: a.quiz_id, scorePercent: a.score_percent, passed: a.passed, createdAt: a.created_at })),
          timeSeconds: time?.seconds ?? 0,
          timeFirstSeenAt: time?.first_seen_at ?? null,
          timeLastSeenAt: time?.last_seen_at ?? null,
        }),
      });
    }
  }

  return {
    rows,
    courses,
    learners,
    attempts: attemptRows.map((a) => ({
      learnerId: a.learner_id,
      quizId: a.quiz_id,
      scorePercent: a.score_percent,
      points: a.points,
      maxPoints: a.max_points,
      passed: a.passed,
      createdAt: a.created_at,
    })),
  };
}

/** Éléments terminés par l'apprenant connecté dans un parcours (pour cocher les contenus). */
export async function getMyCompletedContentIds(learnerId: string, contentIds: string[]): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_completions")
    .select("content_id")
    .eq("learner_id", learnerId)
    .in("content_id", contentIds)
    .returns<{ content_id: string }[]>();
  return new Set((data ?? []).map((r) => r.content_id));
}
