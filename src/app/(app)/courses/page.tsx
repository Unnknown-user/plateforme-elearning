import { BookOpen } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("course:manage");
  return (
    <>
      <PageHeader title="Mes parcours" description="Créez et organisez vos formations." />
      <ComingSoon icon={<BookOpen className="h-6 w-6" aria-hidden />} text="Bientôt ici : la création de parcours, de modules et de contenus (étape 4)." />
    </>
  );
}
