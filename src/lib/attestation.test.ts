// @vitest-environment node
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generateAttestation, safeText, type AttestationData } from "./attestation";

const data: AttestationData = {
  organization: {
    name: "Institut Horizon Formation",
    activityNumber: "11 75 00000 75 (fictif)",
    signatoryName: "Hélène Marchand",
    signatoryTitle: "Directrice",
    primaryColor: "#1d4ed8",
    logo: null,
  },
  learnerName: "Léa Fontaine",
  courseTitle: "Communication écrite professionnelle",
  plannedMinutes: 90,
  timeSeconds: 5400,
  startedAt: "2026-09-22T08:30:00Z",
  completedAt: "2026-09-24T10:12:00Z",
  objectives: ["Rédiger un courriel clair", "Structurer un compte rendu"],
  quizResults: [{ title: "Quiz : les idées clés", bestScore: 100 }],
  issuedAt: new Date("2026-10-09T10:00:00Z"),
};

describe("attestation PDF", () => {
  it("génère un PDF valide d'une page", async () => {
    const bytes = await generateAttestation(data);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("supporte les cas limites : textes très longs, emoji, sans logo ni mentions légales ni objectifs", async () => {
    const long = "Mot ".repeat(400);
    const extreme: AttestationData = {
      ...data,
      learnerName: "Zoé 😀 Müller-Œuvre",
      courseTitle: long,
      objectives: Array.from({ length: 20 }, () => long),
      quizResults: Array.from({ length: 10 }, (_, i) => ({ title: `Quiz ${i} ${long}`, bestScore: 100 })),
      organization: { ...data.organization, activityNumber: null, signatoryName: null, signatoryTitle: null },
    };
    const bytes = await generateAttestation(extreme);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("remplace les caractères non imprimables par « ? » sans toucher aux accents français", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(safeText(font, "Éléonore à Noël, œuvre « test » – 100 %")).toBe("Éléonore à Noël, œuvre « test » – 100 %");
    expect(safeText(font, "Bravo 😀")).toBe("Bravo ?");
    expect(safeText(font, "ligne1\nligne2")).toBe("ligne1 ligne2");
  });
});
