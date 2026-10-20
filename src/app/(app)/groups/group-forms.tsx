"use client";

import { useActionState } from "react";
import { Check, Plus } from "lucide-react";
import { createGroup, renameGroup, type GroupFormState } from "./actions";

const field = "mt-1 w-full rounded-lg border border-zinc-400 bg-white p-2 text-sm text-zinc-900";
const button =
  "inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)] disabled:opacity-60";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(createGroup, { error: null });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="min-w-64 flex-1 text-sm font-medium text-zinc-900">
        Nouveau groupe
        <input name="name" required maxLength={80} placeholder="Ex. : Promotion 2026" className={field} />
      </label>
      <button type="submit" disabled={pending} className={button}>
        <Plus className="h-4 w-4" aria-hidden /> {pending ? "Création…" : "Créer le groupe"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function RenameGroupForm({ groupId, name }: { groupId: string; name: string }) {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(renameGroup, { error: null });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="min-w-64 flex-1 text-sm font-medium text-zinc-900">
        Nom du groupe
        <input name="name" defaultValue={name} key={name} required maxLength={80} className={field} />
      </label>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Enregistrement…" : "Renommer"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p role="status" className="flex w-full items-center gap-2 text-sm text-green-700">
          <Check className="h-4 w-4" aria-hidden /> Enregistré.
        </p>
      )}
    </form>
  );
}
