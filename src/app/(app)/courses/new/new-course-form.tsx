"use client";

import { useActionState } from "react";
import { Card } from "@/components/page-header";
import { createCourse, type FormState } from "../actions";

const field = "mt-1 w-full rounded-lg border border-zinc-400 bg-white p-2.5 text-zinc-900";

export function NewCourseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCourse, { error: null });
  return (
    <Card className="max-w-2xl">
      <form action={action} className="space-y-5">
        <label className="block text-sm font-medium text-zinc-900">
          Titre du parcours
          <input name="title" required maxLength={120} className={field} />
        </label>
        <label className="block text-sm font-medium text-zinc-900">
          Description
          <textarea name="description" rows={3} maxLength={2000} className={field} />
        </label>
        <label className="block text-sm font-medium text-zinc-900">
          Objectifs pédagogiques <span className="font-normal text-zinc-600">(un par ligne)</span>
          <textarea name="objectives" rows={4} maxLength={2000} className={field} />
        </label>
        <label className="block text-sm font-medium text-zinc-900">
          Durée estimée <span className="font-normal text-zinc-600">(en minutes)</span>
          <input name="duration" type="number" min={0} max={100000} step={1} className={`${field} max-w-40`} />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-5 py-2.5 font-medium text-[var(--brand-contrast)] disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer le parcours"}
        </button>
      </form>
    </Card>
  );
}
