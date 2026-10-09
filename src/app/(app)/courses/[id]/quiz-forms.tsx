"use client";

import { useActionState, useRef, useState } from "react";
import { Check, ListChecks, Plus, Settings } from "lucide-react";
import type { QuizRow } from "@/lib/quizzes";
import type { FormState } from "../actions";
import { addQuestion, createQuiz, updateQuizSettings } from "../quiz-actions";

const field = "mt-1 w-full rounded-lg border border-zinc-400 bg-white p-2 text-sm text-zinc-900";
const button =
  "inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)] disabled:opacity-60";

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p role="status" className="flex items-center gap-2 text-sm text-green-700">
          <Check className="h-4 w-4" aria-hidden /> Enregistré.
        </p>
      )}
    </>
  );
}

function SettingsFields({ quiz }: { quiz?: QuizRow }) {
  return (
    <>
      <label className="block text-sm font-medium text-zinc-900">
        Titre du quiz
        <input name="title" defaultValue={quiz?.title ?? ""} required maxLength={120} className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-900">
          Seuil de réussite <span className="font-normal text-zinc-600">(%)</span>
          <input
            name="threshold"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={quiz?.pass_threshold ?? 70}
            required
            className={field}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-900">
          Tentatives maximum <span className="font-normal text-zinc-600">(vide = illimité)</span>
          <input
            name="attempts"
            type="number"
            min={1}
            max={20}
            step={1}
            defaultValue={quiz ? (quiz.max_attempts ?? "") : 3}
            className={field}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-900">
        <input name="showCorrection" type="checkbox" defaultChecked={quiz?.show_correction ?? true} className="h-4 w-4" />
        Afficher la correction à l&apos;apprenant après chaque tentative
      </label>
    </>
  );
}

export function CreateQuizForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createQuiz, { error: null });
  return (
    <details className="rounded-lg border border-dashed border-zinc-300 bg-white p-3">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900">
        <ListChecks className="h-4 w-4" aria-hidden /> Ajouter un quiz à ce module
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="moduleId" value={moduleId} />
        <SettingsFields />
        <Feedback state={state} />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Création…" : "Créer le quiz"}
        </button>
      </form>
    </details>
  );
}

export function QuizSettingsForm({ quiz }: { quiz: QuizRow }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateQuizSettings, { error: null });
  return (
    <details className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900">
        <Settings className="h-4 w-4" aria-hidden /> Réglages du quiz
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="quizId" value={quiz.id} />
        <SettingsFields quiz={quiz} />
        <Feedback state={state} />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Enregistrement…" : "Enregistrer les réglages"}
        </button>
      </form>
    </details>
  );
}

const CHOICE_SLOTS = 4;

export function AddQuestionForm({ quizId }: { quizId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"single" | "multiple" | "true_false">("single");
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await addQuestion(prev, data);
    if (!result.error) formRef.current?.reset();
    return result;
  }, { error: null });

  return (
    <details className="rounded-lg border border-dashed border-zinc-300 bg-white p-3">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900">
        <Plus className="h-4 w-4" aria-hidden /> Ajouter une question
      </summary>
      <form ref={formRef} action={action} className="mt-3 space-y-3">
        <input type="hidden" name="quizId" value={quizId} />
        <label className="block text-sm font-medium text-zinc-900">
          Type de question
          <select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={field}>
            <option value="single">Choix unique (une seule bonne réponse)</option>
            <option value="multiple">Choix multiple (plusieurs bonnes réponses)</option>
            <option value="true_false">Vrai / Faux</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-900">
          Énoncé
          <textarea name="prompt" rows={2} required maxLength={1000} className={field} />
        </label>

        {type === "true_false" ? (
          <fieldset className="text-sm text-zinc-900">
            <legend className="font-medium">L&apos;affirmation est…</legend>
            <label className="mr-6 inline-flex items-center gap-2">
              <input type="radio" name="correct" value="0" defaultChecked /> Vraie
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="correct" value="1" /> Fausse
            </label>
          </fieldset>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-900">
              Réponses possibles{" "}
              <span className="font-normal text-zinc-600">
                ({type === "single" ? "cochez la bonne réponse" : "cochez toutes les bonnes réponses"} ; laissez vide les lignes inutiles)
              </span>
            </legend>
            {Array.from({ length: CHOICE_SLOTS }, (_, i) => (
              <div key={`${type}-${i}`} className="flex items-center gap-2">
                <input
                  type={type === "single" ? "radio" : "checkbox"}
                  name="correct"
                  value={i}
                  aria-label={`Réponse ${i + 1} correcte`}
                  className="h-4 w-4"
                />
                <input name="choice" maxLength={300} placeholder={`Réponse ${i + 1}`} className={`${field} mt-0`} />
              </div>
            ))}
          </fieldset>
        )}

        <label className="block text-sm font-medium text-zinc-900">
          Explication <span className="font-normal text-zinc-600">(affichée avec la correction, facultatif)</span>
          <textarea name="explanation" rows={2} maxLength={1000} className={field} />
        </label>
        <Feedback state={state} />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Ajout…" : "Ajouter la question"}
        </button>
      </form>
    </details>
  );
}
