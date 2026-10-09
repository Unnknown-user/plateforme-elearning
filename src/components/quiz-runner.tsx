"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { submitQuiz, type SubmitState } from "@/app/(app)/learner/[id]/quiz/[quizId]/actions";
import type { QuestionType } from "@/lib/quiz";

// Données minimales envoyées au navigateur : jamais les bonnes réponses.
export type RunnerQuiz = {
  id: string;
  title: string;
  passThreshold: number;
  questions: { id: string; type: QuestionType; prompt: string; choices: { id: string; label: string }[] }[];
};

export function QuizRunner({
  quiz,
  attemptsUsed,
  attemptsMax,
}: {
  quiz: RunnerQuiz;
  attemptsUsed: number;
  attemptsMax: number | null;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [round, setRound] = useState(0);
  const [dismissed, setDismissed] = useState<unknown>(null);

  const [state, action, pending] = useActionState<SubmitState, FormData>(async (prev, formData) => {
    const picks: Record<string, string[]> = {};
    for (const key of new Set(formData.keys())) {
      if (key.startsWith("q_")) picks[key.slice(2)] = formData.getAll(key).map(String);
    }
    setSelected(picks);
    return submitQuiz(prev, formData);
  }, { error: null, result: null });

  const result = state.result && state.result !== dismissed ? state.result : null;
  const remaining = result ? (result.attempts_max === null ? Infinity : result.attempts_max - result.attempts_used) : 0;

  if (result) {
    return (
      <div className="space-y-6">
        <div
          className={`rounded-2xl p-8 text-center ${result.passed ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
        >
          {result.passed ? (
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" aria-hidden />
          ) : (
            <XCircle className="mx-auto mb-3 h-12 w-12 text-amber-600" aria-hidden />
          )}
          <p className="text-4xl font-semibold">{result.score_percent} %</p>
          <p className="mt-1 text-lg font-medium">{result.passed ? "Quiz réussi, bravo !" : "Quiz non réussi"}</p>
          <p className="mt-2 text-sm">
            {result.points} réponse{result.points > 1 ? "s" : ""} juste{result.points > 1 ? "s" : ""} sur {result.max_points} · seuil de
            réussite : {quiz.passThreshold} %
          </p>
          <p className="mt-1 text-sm">
            Tentative {result.attempts_used}
            {result.attempts_max ? ` sur ${result.attempts_max}` : ""}
          </p>
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => {
                setDismissed(state.result);
                setRound((r) => r + 1);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-[var(--brand-contrast)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Réessayer
              {Number.isFinite(remaining) ? ` (${remaining} restante${remaining > 1 ? "s" : ""})` : ""}
            </button>
          )}
        </div>

        {result.review ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Correction</h2>
            {quiz.questions.map((question, index) => {
              const review = result.review!.find((r) => r.question_id === question.id);
              const mine = selected[question.id] ?? [];
              return (
                <section key={question.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="flex items-start gap-2 font-medium text-zinc-900">
                    {review?.correct ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Réponse juste" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="Réponse fausse" />
                    )}
                    {index + 1}. {question.prompt}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {question.choices.map((choice) => {
                      const isCorrect = review?.correct_choice_ids.includes(choice.id);
                      const isMine = mine.includes(choice.id);
                      return (
                        <li
                          key={choice.id}
                          className={`rounded-lg px-3 py-2 ${
                            isCorrect
                              ? "bg-emerald-50 font-medium text-emerald-900"
                              : isMine
                                ? "bg-red-50 text-red-800"
                                : "text-zinc-700"
                          }`}
                        >
                          {choice.label}
                          {isCorrect && <span className="ml-2 text-xs">✓ bonne réponse</span>}
                          {isMine && !isCorrect && <span className="ml-2 text-xs">✗ votre réponse</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {review?.explanation && <p className="mt-3 text-sm text-zinc-600">{review.explanation}</p>}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-600">Votre formateur a choisi de ne pas afficher la correction.</p>
        )}
      </div>
    );
  }

  return (
    <form key={round} action={action} className="space-y-5">
      <input type="hidden" name="quizId" value={quiz.id} />
      {quiz.questions.map((question, index) => (
        <fieldset key={question.id} className="rounded-xl border border-zinc-200 bg-white p-5">
          <legend className="sr-only">Question {index + 1}</legend>
          <p className="font-medium text-zinc-900">
            {index + 1}. {question.prompt}
          </p>
          {question.type === "multiple" && <p className="mt-1 text-xs text-zinc-600">Plusieurs réponses possibles.</p>}
          <div className="mt-3 space-y-2">
            {question.choices.map((choice) => (
              <label
                key={choice.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 hover:bg-zinc-50 has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[color-mix(in_srgb,var(--brand)_10%,white)]"
              >
                <input
                  type={question.type === "multiple" ? "checkbox" : "radio"}
                  name={`q_${question.id}`}
                  value={choice.id}
                  className="h-4 w-4"
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-6 py-3 font-medium text-[var(--brand-contrast)] disabled:opacity-60"
        >
          {pending ? "Correction…" : "Valider mes réponses"}
        </button>
        <p className="text-sm text-zinc-600">
          Tentative {attemptsUsed + 1}
          {attemptsMax ? ` sur ${attemptsMax}` : ""} · seuil de réussite {quiz.passThreshold} %
        </p>
      </div>
    </form>
  );
}
