"use client";

import type { ReactNode } from "react";

/**
 * Bouton d'envoi de formulaire qui demande confirmation avant une action destructive.
 * Annuler la boîte de dialogue empêche l'envoi du formulaire.
 */
export function ConfirmButton({
  message,
  className,
  title,
  children,
}: {
  message: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
