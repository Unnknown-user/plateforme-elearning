import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";
import { buildTracking, formatDateFr, formatSeconds, type TrackingInput } from "./tracking";

const base: TrackingInput = {
  structure: { contentIds: ["c1", "c2", "c3"], quizIds: ["q1"] },
  completions: [],
  attempts: [],
  timeSeconds: 0,
  timeFirstSeenAt: null,
  timeLastSeenAt: null,
};

describe("statut et progression", () => {
  it("aucune trace : non commencé, 0 %", () => {
    expect(buildTracking(base)).toMatchObject({ status: "not_started", percent: 0, startedAt: null, completedAt: null });
  });

  it("du temps passé sans rien terminer : en cours, 0 %", () => {
    const t = buildTracking({ ...base, timeSeconds: 90, timeFirstSeenAt: "2026-10-01T09:00:00Z", timeLastSeenAt: "2026-10-01T09:02:00Z" });
    expect(t).toMatchObject({ status: "in_progress", percent: 0, startedAt: "2026-10-01T09:00:00Z" });
  });

  it("2 contenus sur 3 et quiz non tenté : 2 éléments sur 4 = 50 %", () => {
    const t = buildTracking({
      ...base,
      completions: [
        { contentId: "c1", completedAt: "2026-10-01T09:00:00Z" },
        { contentId: "c2", completedAt: "2026-10-01T10:00:00Z" },
      ],
    });
    expect(t).toMatchObject({ status: "in_progress", percent: 50, doneContents: 2, totalContents: 3, passedQuizzes: 0, totalQuizzes: 1 });
  });

  it("tout terminé mais quiz échoué : pas terminé (75 %)", () => {
    const t = buildTracking({
      ...base,
      completions: ["c1", "c2", "c3"].map((contentId) => ({ contentId, completedAt: "2026-10-01T09:00:00Z" })),
      attempts: [{ quizId: "q1", scorePercent: 40, passed: false, createdAt: "2026-10-01T11:00:00Z" }],
    });
    expect(t).toMatchObject({ status: "in_progress", percent: 75, completedAt: null, averageBestScore: 40, attemptsCount: 1 });
  });

  it("tout terminé et quiz réussi : terminé, avec la date de fin = dernier élément validé", () => {
    const t = buildTracking({
      ...base,
      completions: [
        { contentId: "c1", completedAt: "2026-10-01T09:00:00Z" },
        { contentId: "c2", completedAt: "2026-10-01T10:00:00Z" },
        { contentId: "c3", completedAt: "2026-10-01T10:30:00Z" },
      ],
      attempts: [
        { quizId: "q1", scorePercent: 33, passed: false, createdAt: "2026-10-01T10:40:00Z" },
        { quizId: "q1", scorePercent: 100, passed: true, createdAt: "2026-10-02T08:00:00Z" },
        { quizId: "q1", scorePercent: 67, passed: true, createdAt: "2026-10-03T08:00:00Z" },
      ],
    });
    expect(t).toMatchObject({
      status: "completed",
      percent: 100,
      completedAt: "2026-10-02T08:00:00Z", // 1re réussite, pas la dernière tentative
      startedAt: "2026-10-01T09:00:00Z",
      lastActivityAt: "2026-10-03T08:00:00Z",
      averageBestScore: 100,
      attemptsCount: 3,
    });
  });

  it("ignore les traces d'éléments qui ne font plus partie du parcours", () => {
    const t = buildTracking({
      ...base,
      completions: [{ contentId: "ancien-contenu", completedAt: "2026-10-01T09:00:00Z" }],
      attempts: [{ quizId: "ancien-quiz", scorePercent: 100, passed: true, createdAt: "2026-10-01T09:00:00Z" }],
    });
    expect(t).toMatchObject({ status: "not_started", percent: 0, doneContents: 0, passedQuizzes: 0, attemptsCount: 0 });
  });

  it("un parcours sans aucun élément ne peut jamais être « terminé »", () => {
    const t = buildTracking({ ...base, structure: { contentIds: [], quizIds: [] } });
    expect(t).toMatchObject({ status: "not_started", percent: 0 });
  });

  it("parcours sans quiz : terminé quand tous les contenus le sont ; moyenne des meilleurs scores sur plusieurs quiz", () => {
    const noQuiz = buildTracking({
      ...base,
      structure: { contentIds: ["c1"], quizIds: [] },
      completions: [{ contentId: "c1", completedAt: "2026-10-01T09:00:00Z" }],
    });
    expect(noQuiz).toMatchObject({ status: "completed", percent: 100, averageBestScore: null });

    const two = buildTracking({
      ...base,
      structure: { contentIds: [], quizIds: ["a", "b"] },
      attempts: [
        { quizId: "a", scorePercent: 50, passed: false, createdAt: "2026-10-01T09:00:00Z" },
        { quizId: "a", scorePercent: 90, passed: true, createdAt: "2026-10-01T09:10:00Z" },
        { quizId: "b", scorePercent: 70, passed: true, createdAt: "2026-10-01T09:20:00Z" },
      ],
    });
    expect(two.averageBestScore).toBe(80); // (90 + 70) / 2
  });
});

describe("formats d'affichage", () => {
  it("durées", () => {
    expect(formatSeconds(0)).toBe("0 min");
    expect(formatSeconds(45)).toBe("moins d'1 min");
    expect(formatSeconds(600)).toBe("10 min");
    expect(formatSeconds(3900)).toBe("1 h 05");
    expect(formatSeconds(5400)).toBe("1 h 30");
  });

  it("dates françaises (fuseau de Paris)", () => {
    expect(formatDateFr("2026-10-09T10:00:00Z")).toBe("09/10/2026");
    expect(formatDateFr(null)).toBe("—");
  });
});

describe("export CSV", () => {
  it("échappe les points-virgules, guillemets et retours à la ligne", () => {
    expect(csvCell("simple")).toBe("simple");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('il a dit "oui"')).toBe('"il a dit ""oui"""');
    expect(csvCell("ligne1\nligne2")).toBe('"ligne1\nligne2"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("neutralise les formules Excel (injection) dans les cellules texte", () => {
    expect(csvCell("=SOMME(A1:A9)")).toBe("'=SOMME(A1:A9)");
    expect(csvCell("+33612345678")).toBe("'+33612345678");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5"); // un vrai nombre n'est pas modifié
  });

  it("produit un fichier avec BOM UTF-8, séparateur ; et fins de ligne Windows", () => {
    const csv = toCsv(["Nom", "Score"], [["Léa", 100], ["Inès", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿Nom;Score\r\nLéa;100\r\nInès;\r\n");
  });
});

describe("noms de fichiers", () => {
  it("retire accents et caractères spéciaux", async () => {
    const { slugify } = await import("./tracking");
    expect(slugify("Léa Fontaine")).toBe("lea-fontaine");
    expect(slugify("Sécurité au travail : les bons réflexes !")).toBe("securite-au-travail-les-bons-reflexes");
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("😀")).toBe("document");
    expect(slugify("a".repeat(100)).length).toBe(40);
  });
});
