"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/page-header";

// Affichée quand une action échoue (voir src/lib/action-error.ts) ou qu'un écran ne peut pas se charger.
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden />
      <h1 className="text-lg font-semibold text-zinc-900">Une erreur est survenue</h1>
      <p className="text-zinc-600">
        {process.env.NODE_ENV === "development" ? error.message : "L'opération n'a pas pu aboutir. Vos données n'ont pas été modifiées."}
      </p>
      <button onClick={reset} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)]">
        Réessayer
      </button>
    </Card>
  );
}
