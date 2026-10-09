import { GraduationCap } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("course:take");
  return (
    <>
      <PageHeader title="Mes formations" description="Retrouvez ici vos parcours et vos quiz." />
      <ComingSoon icon={<GraduationCap className="h-6 w-6" aria-hidden />} text="Bientôt ici : vos parcours de formation et vos quiz (étapes 4 et 5)." />
    </>
  );
}
