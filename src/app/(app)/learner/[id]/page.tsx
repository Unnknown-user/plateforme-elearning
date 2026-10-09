import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Target } from "lucide-react";
import { ContentView } from "@/components/course-ui";
import { QuizCard } from "@/components/quiz-card";
import { Card } from "@/components/page-header";
import { formatDuration } from "@/lib/content";
import { getCourse, signedPdfUrls } from "@/lib/courses";
import { getMenu } from "@/lib/permissions";
import { getMyAttempts, getQuizzesByModule } from "@/lib/quizzes";
import { requireUser } from "@/lib/session";

// Lecture d'un parcours. Accessible aux apprenants (parcours publiés) et, en aperçu, aux formateurs.
export default async function LearnerCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  const pdfUrls = await signedPdfUrls(course);
  const quizzes = await getQuizzesByModule(course.modules.map((m) => m.id));
  const attempts = await getMyAttempts(user.id, Object.values(quizzes).map((q) => q.id));
  const objectives = course.objectives.split("\n").filter((line) => line.trim());
  const backHref = getMenu(user.role)[0]?.href ?? "/dashboard";

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour
      </Link>

      <div
        className="mb-8 rounded-2xl p-8 text-white"
        style={{ background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 45%, #4f46e5))" }}
      >
        <h1 className="text-3xl font-semibold tracking-tight [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{course.title}</h1>
        <p className="mt-3 flex items-center gap-2 text-sm [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">
          <Clock className="h-4 w-4" aria-hidden /> {formatDuration(course.duration_minutes)} · {course.modules.length} module
          {course.modules.length > 1 ? "s" : ""}
        </p>
      </div>

      {(course.description || objectives.length > 0) && (
        <Card className="mb-8 grid gap-6 md:grid-cols-2">
          {course.description && <p className="leading-relaxed text-zinc-700">{course.description}</p>}
          {objectives.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Target className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Vous saurez à la fin
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                {objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="space-y-8">
        {course.modules.map((module, index) => (
          <section key={module.id}>
            <h2 className="mb-3 flex items-center gap-3 text-lg font-semibold text-zinc-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-[var(--brand-contrast)]">
                {index + 1}
              </span>
              {module.title}
            </h2>
            <div className="space-y-4">
              {module.contents.map((content) => (
                <ContentView key={content.id} content={content} pdfUrl={content.file_path ? pdfUrls[content.file_path] : undefined} />
              ))}
              {quizzes[module.id] && (
                <QuizCard
                  href={`/learner/${course.id}/quiz/${quizzes[module.id]!.id}`}
                  quiz={quizzes[module.id]!}
                  attempts={attempts.filter((a) => a.quiz_id === quizzes[module.id]!.id)}
                />
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
