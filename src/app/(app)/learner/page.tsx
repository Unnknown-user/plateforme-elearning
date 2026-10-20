import { CourseCard } from "@/components/course-ui";
import { Card, PageHeader } from "@/components/page-header";
import { listCourses } from "@/lib/courses";
import { requireUser } from "@/lib/session";
import { loadTracking } from "@/lib/tracking-data";

export default async function LearnerPage() {
  const user = await requireUser("course:take");
  // La base ne renvoie que les parcours publiés de l'organisme de l'apprenant, et ses propres traces.
  const [courses, tracking] = await Promise.all([listCourses(), loadTracking({ learnerId: user.id })]);
  const progressByCourse = new Map(tracking.rows.map((r) => [r.course.id, r.tracking]));
  const firstName = user.fullName.split(" ")[0];

  return (
    <>
      <PageHeader title={`Bonjour ${firstName} 👋`} description="Retrouvez ici les formations de votre organisme." />
      {courses.length === 0 ? (
        <Card className="py-14 text-center text-zinc-600">Aucune formation ne vous est attribuée pour le moment. Votre organisme vous inscrira à vos parcours.</Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, i) => {
            const t = progressByCourse.get(course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                href={`/learner/${course.id}`}
                index={i}
                showStatus={false}
                progress={t ? { percent: t.percent, status: t.status } : undefined}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
