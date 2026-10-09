"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import type { ContentRow } from "@/lib/courses";
import { addContent, addModule, renameModule, updateContent, type FormState } from "../actions";

const field = "mt-1 w-full rounded-lg border border-zinc-400 bg-white p-2 text-sm text-zinc-900";
const button =
  "inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)] disabled:opacity-60";

export function AddModuleForm({ courseId }: { courseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await addModule(prev, data);
    if (!result.error) formRef.current?.reset();
    return result;
  }, { error: null });

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="courseId" value={courseId} />
      <label className="min-w-64 flex-1 text-sm font-medium text-zinc-900">
        Nouveau module
        <input name="title" required maxLength={120} placeholder="Ex. : Les fondamentaux" className={field} />
      </label>
      <button type="submit" disabled={pending} className={button}>
        <Plus className="h-4 w-4" aria-hidden /> Ajouter le module
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AddContentForm({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"text" | "video" | "pdf">("text");
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await addContent(prev, data);
    if (!result.error) formRef.current?.reset();
    return result;
  }, { error: null });

  return (
    <details className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-900">Ajouter un contenu</summary>
      <form ref={formRef} action={action} className="mt-3 space-y-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="moduleId" value={moduleId} />
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <label className="text-sm font-medium text-zinc-900">
            Type
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className={field}
            >
              <option value="text">Texte</option>
              <option value="video">Vidéo (lien)</option>
              <option value="pdf">Document PDF</option>
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-900">
            Titre
            <input name="title" required maxLength={120} className={field} />
          </label>
        </div>

        {type === "text" && (
          <label className="block text-sm font-medium text-zinc-900">
            Texte <span className="font-normal text-zinc-600">(une ligne vide sépare les paragraphes)</span>
            <textarea name="body" rows={5} maxLength={20000} className={field} />
          </label>
        )}
        {type === "video" && (
          <label className="block text-sm font-medium text-zinc-900">
            Lien YouTube ou Vimeo
            <input name="url" type="url" placeholder="https://www.youtube.com/watch?v=…" className={field} />
          </label>
        )}
        {type === "pdf" && (
          <label className="block text-sm font-medium text-zinc-900">
            Fichier PDF <span className="font-normal text-zinc-600">(10 Mo maximum)</span>
            <input name="file" type="file" accept="application/pdf" className={field} />
          </label>
        )}

        {state.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Ajout…" : "Ajouter"}
        </button>
      </form>
    </details>
  );
}

export function RenameModuleForm({ courseId, moduleId, title }: { courseId: string; moduleId: string; title: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renameModule, { error: null });
  return (
    <details className="relative">
      <summary
        title="Renommer le module"
        aria-label="Renommer le module"
        className="cursor-pointer list-none rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </summary>
      <form
        action={action}
        className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="moduleId" value={moduleId} />
        <label className="block text-sm font-medium text-zinc-900">
          Titre du module
          <input name="title" defaultValue={title} key={title} required maxLength={120} className={field} />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </details>
  );
}

export function EditContentForm({ courseId, content }: { courseId: string; content: ContentRow }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateContent, { error: null });
  return (
    <details className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900">
        <Pencil className="h-4 w-4" aria-hidden /> Modifier ce contenu
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="contentId" value={content.id} />
        <label className="block text-sm font-medium text-zinc-900">
          Titre
          <input name="title" defaultValue={content.title} key={content.title} required maxLength={120} className={field} />
        </label>
        {content.type === "text" && (
          <label className="block text-sm font-medium text-zinc-900">
            Texte
            <textarea
              name="body"
              defaultValue={content.body ?? ""}
              key={content.body}
              rows={8}
              maxLength={20000}
              className={field}
            />
          </label>
        )}
        {content.type === "video" && (
          <label className="block text-sm font-medium text-zinc-900">
            Lien YouTube ou Vimeo
            <input name="url" type="url" defaultValue={content.url ?? ""} key={content.url} className={field} />
          </label>
        )}
        {content.type === "pdf" && (
          <p className="text-sm text-zinc-600">Pour remplacer le fichier, supprimez ce contenu puis ajoutez le nouveau PDF.</p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.saved && !state.error && (
          <p role="status" className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4" aria-hidden /> Modifications enregistrées.
          </p>
        )}
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </details>
  );
}
