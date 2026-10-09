import { CourseCard } from "@/components/course-ui";
import { Card, PageHeader } from "@/components/page-header";
import { listCourses } from "@/lib/courses";
import { requireUser } from "@/lib/session";

export default async function LearnerPage() {
  const user = await requireUser("course:take");
  // La base ne renvoie que les parcours publiés de l'organisme de l'apprenant.
  const courses = await listCourses();
  const firstName = user.fullName.split(" ")[0];

  return (
    <>
      <PageHeader title={`Bonjour ${firstName} 👋`} description="Retrouvez ici les formations de votre organisme." />
      {courses.length === 0 ? (
        <Card className="py-14 text-center text-zinc-600">Aucune formation disponible pour le moment.</Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, i) => (
            <CourseCard key={course.id} course={course} href={`/learner/${course.id}`} index={i} showStatus={false} />
          ))}
        </div>
      )}
    </>
  );
}
