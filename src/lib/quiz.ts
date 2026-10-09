// Règles de saisie d'un quiz (réglages et questions). Logique pure, testée dans quiz.test.ts.
// Le calcul du score n'est PAS ici : il est fait dans la base (fonction submit_quiz_attempt).
import type { Validation } from "@/lib/content";

export const QUESTION_TYPES = ["single", "multiple", "true_false"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Choix unique",
  multiple: "Choix multiple",
  true_false: "Vrai / Faux",
};

export const MAX_CHOICES = 6;
export const PROMPT_MAX = 1000;
export const CHOICE_MAX = 300;

export type QuizSettings = { title: string; passThreshold: number; maxAttempts: number | null; showCorrection: boolean };

export function validateQuizSettings(raw: {
  title: string;
  threshold: string;
  attempts: string;
  showCorrection: boolean;
}): Validation<QuizSettings> {
  const title = raw.title.trim();
  if (!title) return { ok: false, error: "Le titre du quiz est obligatoire." };
  if (title.length > 120) return { ok: false, error: "Le titre ne doit pas dépasser 120 caractères." };

  const passThreshold = Number(raw.threshold);
  if (raw.threshold.trim() === "" || !Number.isInteger(passThreshold) || passThreshold < 0 || passThreshold > 100) {
    return { ok: false, error: "Le seuil de réussite doit être un nombre entier entre 0 et 100." };
  }

  // Champ vide = tentatives illimitées.
  let maxAttempts: number | null = null;
  if (raw.attempts.trim() !== "") {
    maxAttempts = Number(raw.attempts);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
      return { ok: false, error: "Le nombre de tentatives doit être compris entre 1 et 20 (ou vide pour illimité)." };
    }
  }
  return { ok: true, value: { title, passThreshold, maxAttempts, showCorrection: raw.showCorrection } };
}

export type QuestionInput = {
  type: QuestionType;
  prompt: string;
  explanation: string;
  choices: { label: string; isCorrect: boolean }[];
};

export function isQuestionType(value: string): value is QuestionType {
  return (QUESTION_TYPES as readonly string[]).includes(value);
}

/**
 * choices : libellés saisis (les lignes vides sont ignorées) ; correct : indices des bonnes réponses
 * (dans la liste saisie, lignes vides comprises). Pour vrai/faux, correct vaut [0] (Vrai) ou [1] (Faux).
 */
export function validateQuestion(raw: {
  type: string;
  prompt: string;
  explanation: string;
  choices: string[];
  correct: number[];
}): Validation<QuestionInput> {
  if (!isQuestionType(raw.type)) return { ok: false, error: "Type de question inconnu." };
  const prompt = raw.prompt.trim();
  const explanation = raw.explanation.trim();
  if (!prompt) return { ok: false, error: "L'énoncé de la question est obligatoire." };
  if (prompt.length > PROMPT_MAX) return { ok: false, error: `L'énoncé ne doit pas dépasser ${PROMPT_MAX} caractères.` };
  if (explanation.length > PROMPT_MAX) return { ok: false, error: "L'explication est trop longue." };

  if (raw.type === "true_false") {
    if (raw.correct.length !== 1 || ![0, 1].includes(raw.correct[0]!)) {
      return { ok: false, error: "Indiquez si l'affirmation est vraie ou fausse." };
    }
    return {
      ok: true,
      value: {
        type: "true_false",
        prompt,
        explanation,
        choices: [
          { label: "Vrai", isCorrect: raw.correct[0] === 0 },
          { label: "Faux", isCorrect: raw.correct[0] === 1 },
        ],
      },
    };
  }

  if (raw.choices.length > MAX_CHOICES) return { ok: false, error: `Maximum ${MAX_CHOICES} réponses possibles.` };
  const choices = raw.choices
    .map((label, index) => ({ label: label.trim(), isCorrect: raw.correct.includes(index) }))
    .filter((c) => c.label !== "");
  if (choices.length < 2) return { ok: false, error: "Saisissez au moins deux réponses possibles." };
  if (choices.some((c) => c.label.length > CHOICE_MAX)) {
    return { ok: false, error: `Une réponse ne doit pas dépasser ${CHOICE_MAX} caractères.` };
  }
  // Une bonne réponse cochée sur une ligne vide ne compte pas : on compte après filtrage.
  const correctCount = choices.filter((c) => c.isCorrect).length;
  if (raw.type === "single" && correctCount !== 1) {
    return { ok: false, error: "Une question à choix unique doit avoir exactement une bonne réponse." };
  }
  if (raw.type === "multiple" && correctCount < 1) {
    return { ok: false, error: "Cochez au moins une bonne réponse." };
  }
  if (raw.type === "multiple" && correctCount === choices.length) {
    return { ok: false, error: "Toutes les réponses ne peuvent pas être correctes : ajoutez une réponse fausse." };
  }
  return { ok: true, value: { type: raw.type, prompt, explanation, choices } };
}

/** Traduit les erreurs de la base en messages lisibles. */
export function submitErrorMessage(code: string): string {
  if (code.includes("attempts_exhausted")) return "Vous avez utilisé toutes vos tentatives pour ce quiz.";
  if (code.includes("quiz_not_found")) return "Ce quiz n'est pas disponible.";
  if (code.includes("not_allowed")) return "Seuls les apprenants peuvent passer un quiz.";
  if (code.includes("empty_quiz")) return "Ce quiz ne contient pas encore de question.";
  return "Votre réponse n'a pas pu être enregistrée. Réessayez.";
}
