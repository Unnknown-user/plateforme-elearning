import Link from "next/link";
import { ListChecks } from "lucide-react";
import type { AttemptRow, QuizRow } from "@/lib/quizzes";

/** Carte « quiz » affichée à la fin d'un module dans la vue apprenant. */
export function QuizCard({ href, quiz, attempts }: { href: string; quiz: QuizRow; attempts: AttemptRow[] }) {
  const best = attempts.reduce<number | null>((max, a) => (max === null || a.score_percent > max ? a.score_percent : max), null);
  const passed = attempts.some((a) => a.passed);
  const exhausted = quiz.max_attempts !== null && attempts.length >= quiz.max_attempts;
  const label = attempts.length === 0 ? "Commencer le quiz" : exhausted ? "Voir le quiz" : "Refaire le quiz";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-violet-200 bg-violet-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
          <ListChecks className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-zinc-900">{quiz.title}</p>
          <p className="text-sm text-zinc-600">
            {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} · réussite à {quiz.pass_threshold} %
            {quiz.max_attempts ? ` · ${attempts.length}/${quiz.max_attempts} tentative${quiz.max_attempts > 1 ? "s" : ""}` : ""}
          </p>
          {best !== null && (
            <p className="mt-1 flex items-center gap-2 text-sm">
              <span className="text-zinc-700">Meilleur score : {best} %</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
              >
                {passed ? "Réussi" : "Non réussi"}
              </span>
            </p>
          )}
        </div>
      </div>
      <Link
        href={href}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
      >
        {label}
      </Link>
    </div>
  );
}
