import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { NewCourseForm } from "./new-course-form";

export default async function NewCoursePage() {
  await requireUser("course:manage");
  return (
    <>
      <PageHeader title="Nouveau parcours" description="Décrivez votre formation. Vous ajouterez ensuite les modules et les contenus." />
      <NewCourseForm />
    </>
  );
}
