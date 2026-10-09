import { Suspense, type CSSProperties } from "react";
import { LogOut } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { contrastColor, initials } from "@/lib/branding";
import { getMenu, ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-600">Chargement…</p>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { organization } = user;
  const brand = organization.primaryColor;

  // Marque blanche : la couleur de l'organisme est exposée à toute l'interface via des variables CSS.
  const brandVars = { "--brand": brand, "--brand-contrast": contrastColor(brand) } as CSSProperties;

  return (
    <div style={brandVars} className="min-h-screen bg-zinc-50 md:grid md:grid-cols-[17rem_1fr]">
      <aside className="flex flex-col gap-4 border-b border-zinc-200 bg-white p-4 md:min-h-screen md:border-b-0 md:border-r md:p-5">
        <div className="flex items-center gap-3">
          {organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo hébergé sur Supabase Storage
            <img src={organization.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand)] font-semibold text-[var(--brand-contrast)]"
            >
              {initials(organization.name)}
            </span>
          )}
          <span className="font-semibold leading-tight text-zinc-900">{organization.name}</span>
        </div>

        <SidebarNav items={getMenu(user.role)} />

        <div className="mt-auto flex items-center gap-3 border-t border-zinc-200 pt-4">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-contrast)]"
          >
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium text-zinc-900">{user.fullName}</p>
            <p className="text-zinc-600">{ROLE_LABELS[user.role]}</p>
          </div>
          <form action={signOut}>
            <button
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </form>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl p-6 md:p-10">{children}</main>
    </div>
  );
}
