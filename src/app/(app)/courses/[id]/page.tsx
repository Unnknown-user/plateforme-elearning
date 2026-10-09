import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Eye, EyeOff, Globe, Target, Trash2 } from "lucide-react";
import { CONTENT_ICONS, CONTENT_LABELS, StatusBadge } from "@/components/course-ui";
import { Card } from "@/components/page-header";
import { formatDuration } from "@/lib/content";
import { getCourse } from "@/lib/courses";
import { requireUser } from "@/lib/session";
import { deleteContent, deleteCourse, deleteModule, setCourseStatus } from "../actions";
import { AddContentForm, AddModuleForm } from "./course-forms";

export default async function CourseManagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("course:manage");
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

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

      <h2 className="mb-3 text-lg font-semibold text-zinc-900">Modules</h2>
      <div className="space-y-4">
        {course.modules.map((module, index) => (
          <Card key={module.id} className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-3 font-semibold text-zinc-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-[var(--brand-contrast)]">
                  {index + 1}
                </span>
                {module.title}
              </h3>
              <form action={deleteModule}>
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <button title="Supprimer le module" aria-label="Supprimer le module" className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </form>
            </div>

            <ul className="divide-y divide-zinc-100">
              {module.contents.map((content) => {
                const Icon = CONTENT_ICONS[content.type];
                return (
                  <li key={content.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Icon className="h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden />
                    <span className="flex-1 text-zinc-900">{content.title}</span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">
                      {CONTENT_LABELS[content.type]}
                    </span>
                    <form action={deleteContent}>
                      <input type="hidden" name="contentId" value={content.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <button title="Supprimer le contenu" aria-label="Supprimer le contenu" className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                );
              })}
              {module.contents.length === 0 && <li className="py-2.5 text-sm text-zinc-600">Aucun contenu pour le moment.</li>}
            </ul>

            <AddContentForm courseId={course.id} moduleId={module.id} />
          </Card>
        ))}

        <Card className="p-5">
          <AddModuleForm courseId={course.id} />
        </Card>
      </div>
    </>
  );
}
