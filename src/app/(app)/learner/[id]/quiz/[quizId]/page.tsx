import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/page-header";
import { QuizRunner } from "@/components/quiz-runner";
import { TimeTracker } from "@/components/time-tracker";
import { can } from "@/lib/permissions";
import { getMyAttempts, getQuiz } from "@/lib/quizzes";
import { requireUser } from "@/lib/session";

export default async function QuizPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const user = await requireUser();
  const { id: courseId, quizId } = await params;
  const quiz = await getQuiz(quizId);
  if (!quiz) notFound();

  const back = (
    <Link href={`/learner/${courseId}`} className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Retour au parcours
    </Link>
  );

  // Formateur / administrateur : aperçu avec les bonnes réponses, sans possibilité de répondre.
  if (!can(user.role, "course:take")) {
    return (
      <>
        {back}
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">{quiz.title}</h1>
        <p className="mb-6 text-sm text-zinc-600">Aperçu formateur : les bonnes réponses sont indiquées. Seuls les apprenants peuvent répondre.</p>
        <div className="space-y-4">
          {quiz.questions.map((question, index) => (
            <Card key={question.id} className="p-5">
              <p className="font-medium text-zinc-900">
                {index + 1}. {question.prompt}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {question.choices.map((choice) => (
                  <li key={choice.id} className={`flex items-center gap-2 ${choice.isCorrect ? "font-medium text-emerald-800" : "text-zinc-700"}`}>
                    {choice.isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : <Circle className="h-4 w-4 text-zinc-300" aria-hidden />}
                    {choice.label}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const attempts = await getMyAttempts(user.id, [quiz.id]);
  const exhausted = quiz.max_attempts !== null && attempts.length >= quiz.max_attempts;
  const best = attempts.reduce<number | null>((max, a) => (max === null || a.score_percent > max ? a.score_percent : max), null);

  return (
    <>
      <TimeTracker courseId={courseId} />
      {back}
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">{quiz.title}</h1>
      <p className="mb-6 text-sm text-zinc-600">
        {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} · réussite à partir de {quiz.pass_threshold} %
      </p>

      {quiz.questions.length === 0 ? (
        <Card className="text-zinc-600">Ce quiz ne contient pas encore de question.</Card>
      ) : exhausted ? (
        <Card className="text-center">
          <p className="text-lg font-semibold text-zinc-900">Vous avez utilisé toutes vos tentatives.</p>
          <p className="mt-2 text-zinc-600">
            Meilleur score : {best} % · {attempts.some((a) => a.passed) ? "quiz réussi" : "quiz non réussi"}
          </p>
        </Card>
      ) : (
        <QuizRunner
          quiz={{
            id: quiz.id,
            title: quiz.title,
            passThreshold: quiz.pass_threshold,
            // Seuls les libellés partent vers le navigateur de l'apprenant.
            questions: quiz.questions.map((q) => ({
              id: q.id,
              type: q.type,
              prompt: q.prompt,
              choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
            })),
          }}
          attemptsUsed={attempts.length}
          attemptsMax={quiz.max_attempts}
        />
      )}
    </>
  );
}
