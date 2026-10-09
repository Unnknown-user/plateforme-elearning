import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { BrandingForm } from "./branding-form";

export default async function SettingsPage() {
  const user = await requireUser("organization:manage");
  const { organization } = user;

  return (
    <>
      <PageHeader
        title="Paramètres de l'organisme"
        description="Personnalisez l'apparence de la plateforme : vos apprenants et formateurs verront votre nom, votre logo et vos couleurs."
      />
      <BrandingForm name={organization.name} color={organization.primaryColor} logoUrl={organization.logoUrl} />
    </>
  );
}
