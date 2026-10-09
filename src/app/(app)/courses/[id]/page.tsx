import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Clock, Eye, EyeOff, Globe, Target, Trash2 } from "lucide-react";
import { ContentView, StatusBadge } from "@/components/course-ui";
import { Card } from "@/components/page-header";
import { formatDuration } from "@/lib/content";
import { QuizEditor } from "@/components/quiz-editor";
import { getCourse, signedPdfUrls } from "@/lib/courses";
import { getQuizzesByModule } from "@/lib/quizzes";
import { requireUser } from "@/lib/session";
import { deleteContent, deleteCourse, deleteModule, moveContent, moveModule, setCourseStatus } from "../actions";
import { AddContentForm, AddModuleForm, EditContentForm, EditCourseForm, RenameModuleForm } from "./course-forms";

export default async function CourseManagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("course:manage");
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  const pdfUrls = await signedPdfUrls(course);
  const quizzes = await getQuizzesByModule(course.modules.map((m) => m.id));
  const published = course.status === "published";
  const objectives = course.objectives.split("\n").filter((line) => line.trim());

  return (
    <>
      <Link href="/courses" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Tous les parcours
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{course.title}</h1>
            <StatusBadge status={course.status} />
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
            <Clock className="h-4 w-4" aria-hidden /> {formatDuration(course.duration_minutes)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/learner/${course.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <Eye className="h-4 w-4" aria-hidden /> Aperçu apprenant
          </Link>
          <form action={setCourseStatus}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="status" value={published ? "draft" : "published"} />
            <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)]">
              {published ? <EyeOff className="h-4 w-4" aria-hidden /> : <Globe className="h-4 w-4" aria-hidden />}
              {published ? "Repasser en brouillon" : "Publier"}
            </button>
          </form>
          <form action={deleteCourse}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" aria-hidden /> Supprimer
            </button>
          </form>
        </div>
      </div>

      <EditCourseForm course={course} />

      {(course.description || objectives.length > 0) && (
        <Card className="mb-6 grid gap-6 md:grid-cols-2">
          {course.description && <p className="leading-relaxed text-zinc-700">{course.description}</p>}
          {objectives.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Target className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Objectifs pédagogiques
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

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Modules</h2>
        <p className="text-sm text-zinc-600">Chaque contenu est affiché tel que l&apos;apprenant le verra.</p>
      </div>

      <div className="space-y-6">
        {course.modules.map((module, index) => (
          <section key={module.id} className="rounded-2xl border border-zinc-200 bg-zinc-100/60 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-3 text-lg font-semibold text-zinc-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-[var(--brand-contrast)]">
                  {index + 1}
                </span>
                {module.title}
              </h3>
              <div className="flex items-center gap-1">
                <MoveButtons
                  action={moveModule}
                  fields={{ courseId: course.id, moduleId: module.id }}
                  index={index}
                  count={course.modules.length}
                  label="le module"
                />
                <RenameModuleForm courseId={course.id} moduleId={module.id} title={module.title} />
                <form action={deleteModule}>
                  <input type="hidden" name="moduleId" value={module.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <button
                    title="Supprimer le module"
                    aria-label="Supprimer le module"
                    className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-5">
              {module.contents.map((content) => (
                <div key={content.id} className="space-y-2">
                  <ContentView content={content} pdfUrl={content.file_path ? pdfUrls[content.file_path] : undefined} />
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <EditContentForm courseId={course.id} content={content} />
                    </div>
                    <MoveButtons
                      action={moveContent}
                      fields={{ moduleId: module.id, contentId: content.id }}
                      index={module.contents.indexOf(content)}
                      count={module.contents.length}
                      label="le contenu"
                    />
                    <form action={deleteContent}>
                      <input type="hidden" name="contentId" value={content.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <button className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" aria-hidden /> Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {module.contents.length === 0 && (
                <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
                  Ce module est vide. Ajoutez un premier contenu ci-dessous.
                </p>
              )}
              <AddContentForm courseId={course.id} moduleId={module.id} />
              <QuizEditor moduleId={module.id} quiz={quizzes[module.id]} />
            </div>
          </section>
        ))}

        <Card className="p-5">
          <AddModuleForm courseId={course.id} />
        </Card>
      </div>
    </>
  );
}

/** Deux flèches (monter / descendre) ; chacune envoie un petit formulaire à l'action serveur. */
function MoveButtons({
  action,
  fields,
  index,
  count,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  index: number;
  count: number;
  label: string;
}) {
  return (
    <div className="flex">
      {(["up", "down"] as const).map((direction) => {
        const disabled = direction === "up" ? index === 0 : index === count - 1;
        const text = `${direction === "up" ? "Monter" : "Descendre"} ${label}`;
        return (
          <form key={direction} action={action}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input type="hidden" name="direction" value={direction} />
            <button
              disabled={disabled}
              title={text}
              aria-label={text}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              {direction === "up" ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
            </button>
          </form>
        );
      })}
    </div>
  );
}
