import Link from "next/link";
import { Suspense } from "react";
import { getMenu, ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";

// La partie qui dépend de la personne connectée est dans un Suspense :
// Next.js peut ainsi afficher un écran d'attente pendant la vérification de la session.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-600">Chargement…</p>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const menu = getMenu(user.role);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 p-4">
          <span className="font-semibold">{user.organization.name}</span>
          <nav className="flex flex-1 gap-4 text-sm">
            {menu.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="text-sm text-zinc-600">
            {user.fullName} · {ROLE_LABELS[user.role]}
          </span>
          <form action={signOut}>
            <button className="text-sm underline">Se déconnecter</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </div>
  );
}
