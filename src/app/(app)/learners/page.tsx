import { Users } from "lucide-react";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("learners:view");
  return (
    <>
      <PageHeader title="Apprenants et suivi" description="Suivez la progression et les traces de chaque apprenant." />
      <ComingSoon icon={<Users className="h-6 w-6" aria-hidden />} text="Bientôt ici : le suivi de progression, les exports et les attestations (étape 6)." />
    </>
  );
}
