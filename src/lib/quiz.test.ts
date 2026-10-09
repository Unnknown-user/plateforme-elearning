import { describe, expect, it } from "vitest";
import { submitErrorMessage, validateQuestion, validateQuizSettings } from "./quiz";

describe("réglages du quiz", () => {
  const base = { title: " Quiz 1 ", threshold: "70", attempts: "3", showCorrection: true };

  it("accepte des réglages valides", () => {
    expect(validateQuizSettings(base)).toEqual({
      ok: true,
      value: { title: "Quiz 1", passThreshold: 70, maxAttempts: 3, showCorrection: true },
    });
  });

  it("tentatives vides = illimitées", () => {
    const r = validateQuizSettings({ ...base, attempts: "" });
    expect(r.ok && r.value.maxAttempts).toBeNull();
  });

  it("accepte les seuils limites 0 et 100", () => {
    expect(validateQuizSettings({ ...base, threshold: "0" }).ok).toBe(true);
    expect(validateQuizSettings({ ...base, threshold: "100" }).ok).toBe(true);
  });

  it("refuse seuil hors limites, décimal ou vide, et tentatives invalides", () => {
    for (const threshold of ["-1", "101", "70.5", "", "abc"]) {
      expect(validateQuizSettings({ ...base, threshold }).ok).toBe(false);
    }
    for (const attempts of ["0", "21", "1.5", "x"]) {
      expect(validateQuizSettings({ ...base, attempts }).ok).toBe(false);
    }
    expect(validateQuizSettings({ ...base, title: "  " }).ok).toBe(false);
  });
});

describe("validation d'une question", () => {
  const single = { type: "single", prompt: "Q ?", explanation: "", choices: ["A", "B", "C", ""], correct: [1] };

  it("accepte un choix unique valide et ignore les lignes vides", () => {
    const r = validateQuestion(single);
    expect(r.ok && r.value.choices).toEqual([
      { label: "A", isCorrect: false },
      { label: "B", isCorrect: true },
      { label: "C", isCorrect: false },
    ]);
  });

  it("choix unique : exactement une bonne réponse", () => {
    expect(validateQuestion({ ...single, correct: [] }).ok).toBe(false);
    expect(validateQuestion({ ...single, correct: [0, 1] }).ok).toBe(false);
    // une bonne réponse cochée sur une ligne vide ne compte pas
    expect(validateQuestion({ ...single, correct: [3] }).ok).toBe(false);
  });

  it("choix multiple : au moins une bonne réponse, mais pas toutes", () => {
    const multiple = { ...single, type: "multiple" };
    expect(validateQuestion({ ...multiple, correct: [0, 2] }).ok).toBe(true);
    expect(validateQuestion({ ...multiple, correct: [] }).ok).toBe(false);
    expect(validateQuestion({ ...multiple, correct: [0, 1, 2] }).ok).toBe(false);
  });

  it("refuse moins de deux réponses, un énoncé vide et un type inconnu", () => {
    expect(validateQuestion({ ...single, choices: ["A", "", ""], correct: [0] }).ok).toBe(false);
    expect(validateQuestion({ ...single, prompt: "  " }).ok).toBe(false);
    expect(validateQuestion({ ...single, type: "essay" }).ok).toBe(false);
  });

  it("vrai/faux : génère Vrai et Faux, la bonne réponse selon le choix", () => {
    const vrai = validateQuestion({ type: "true_false", prompt: "Le ciel est bleu.", explanation: "", choices: [], correct: [0] });
    expect(vrai.ok && vrai.value.choices).toEqual([
      { label: "Vrai", isCorrect: true },
      { label: "Faux", isCorrect: false },
    ]);
    const faux = validateQuestion({ type: "true_false", prompt: "P", explanation: "", choices: [], correct: [1] });
    expect(faux.ok && faux.value.choices[1]!.isCorrect).toBe(true);
    expect(validateQuestion({ type: "true_false", prompt: "P", explanation: "", choices: [], correct: [] }).ok).toBe(false);
  });
});

describe("messages d'erreur de soumission", () => {
  it("traduit les codes de la base", () => {
    expect(submitErrorMessage("attempts_exhausted")).toContain("tentatives");
    expect(submitErrorMessage("quiz_not_found")).toContain("pas disponible");
    expect(submitErrorMessage("quelque chose d'inattendu")).toContain("Réessayez");
  });
});
