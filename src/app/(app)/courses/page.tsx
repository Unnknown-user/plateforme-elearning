import Link from "next/link";
import { BookOpen, CheckCircle2, Layers, Plus } from "lucide-react";
import { CourseCard, StatCard } from "@/components/course-ui";
import { Card, PageHeader } from "@/components/page-header";
import { listCourses } from "@/lib/courses";
import { requireUser } from "@/lib/session";

export default async function CoursesPage() {
  await requireUser("course:manage");
  const courses = await listCourses();
  const published = courses.filter((c) => c.status === "published").length;
  const modules = courses.reduce((sum, c) => sum + c.modules.length, 0);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Mes parcours" description="Créez, organisez et publiez vos formations." />
        <Link
          href="/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-[var(--brand-contrast)] shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden /> Nouveau parcours
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" icon={<BookOpen className="h-6 w-6" aria-hidden />} label="Parcours" value={courses.length} />
        <StatCard tone="emerald" icon={<CheckCircle2 className="h-6 w-6" aria-hidden />} label="Publiés" value={published} />
        <StatCard tone="violet" icon={<Layers className="h-6 w-6" aria-hidden />} label="Modules" value={modules} />
      </div>

      {courses.length === 0 ? (
        <Card className="py-14 text-center text-zinc-600">Aucun parcours pour le moment. Créez le premier !</Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, i) => (
            <CourseCard key={course.id} course={course} href={`/courses/${course.id}`} index={i} showStatus />
          ))}
        </div>
      )}
    </>
  );
}
