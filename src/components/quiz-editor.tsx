import { CheckCircle2, Circle, ListChecks, Trash2 } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "@/lib/quiz";
import type { QuizRow } from "@/lib/quizzes";
import { deleteQuestion, deleteQuiz } from "@/app/(app)/courses/quiz-actions";
import { AddQuestionForm, CreateQuizForm, QuizSettingsForm } from "@/app/(app)/courses/[id]/quiz-forms";

/** Bloc « quiz » d'un module, côté formateur : réglages, questions avec leurs bonnes réponses. */
export function QuizEditor({ moduleId, quiz }: { moduleId: string; quiz: QuizRow | undefined }) {
  if (!quiz) return <CreateQuizForm moduleId={moduleId} />;

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 font-semibold text-zinc-900">
          <ListChecks className="h-5 w-5 text-violet-700" aria-hidden /> {quiz.title}
        </h4>
        <form action={deleteQuiz}>
          <input type="hidden" name="quizId" value={quiz.id} />
          <button className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" aria-hidden /> Supprimer le quiz
          </button>
        </form>
      </div>

      <ul className="flex flex-wrap gap-2 text-xs">
        <li className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-800">Seuil : {quiz.pass_threshold} %</li>
        <li className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-800">
          {quiz.max_attempts ? `${quiz.max_attempts} tentative${quiz.max_attempts > 1 ? "s" : ""} max` : "Tentatives illimitées"}
        </li>
        <li className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-800">
          Correction {quiz.show_correction ? "affichée" : "masquée"}
        </li>
      </ul>

      <ol className="space-y-3">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-zinc-900">
                {index + 1}. {question.prompt}
              </p>
              <form action={deleteQuestion}>
                <input type="hidden" name="questionId" value={question.id} />
                <button
                  title="Supprimer la question"
                  aria-label="Supprimer la question"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </form>
            </div>
            <p className="mb-2 text-xs text-zinc-600">{QUESTION_TYPE_LABELS[question.type]}</p>
            <ul className="space-y-1 text-sm">
              {question.choices.map((choice) => (
                <li key={choice.id} className={`flex items-center gap-2 ${choice.isCorrect ? "font-medium text-emerald-800" : "text-zinc-700"}`}>
                  {choice.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Bonne réponse" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
                  )}
                  {choice.label}
                </li>
              ))}
            </ul>
            {question.explanation && <p className="mt-2 text-xs text-zinc-600">Explication : {question.explanation}</p>}
          </li>
        ))}
        {quiz.questions.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
            Ce quiz n&apos;a pas encore de question.
          </li>
        )}
      </ol>

      <AddQuestionForm quizId={quiz.id} />
      <QuizSettingsForm quiz={quiz} />
    </div>
  );
}
