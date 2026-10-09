import type { ReactNode } from "react";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      {description && <p className="mt-1 text-zinc-600">{description}</p>}
    </header>
  );
}

/** Carte blanche arrondie, élément de base des écrans. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

/** Message affiché sur les écrans pas encore construits. */
export function ComingSoon({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,white)] text-zinc-800">
        {icon}
      </span>
      <p className="max-w-sm text-zinc-600">{text}</p>
    </Card>
  );
}
