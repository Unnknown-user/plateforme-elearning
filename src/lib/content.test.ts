import { describe, expect, it } from "vitest";
import {
  formatDuration,
  parseVideoUrl,
  validateContent,
  validateCourse,
  validatePdf,
  validateTitle,
} from "./content";

describe("validation d'un parcours", () => {
  const base = { title: " Accueil ", description: "d", objectives: "o", duration: "90" };

  it("accepte une saisie valide et nettoie les espaces", () => {
    expect(validateCourse(base)).toEqual({
      ok: true,
      value: { title: "Accueil", description: "d", objectives: "o", durationMinutes: 90 },
    });
  });

  it("traite une durée vide comme 0", () => {
    const r = validateCourse({ ...base, duration: "" });
    expect(r.ok && r.value.durationMinutes).toBe(0);
  });

  it("refuse titre vide, titre trop long et durée invalide", () => {
    expect(validateCourse({ ...base, title: "  " }).ok).toBe(false);
    expect(validateCourse({ ...base, title: "a".repeat(121) }).ok).toBe(false);
    expect(validateCourse({ ...base, duration: "-5" }).ok).toBe(false);
    expect(validateCourse({ ...base, duration: "1.5" }).ok).toBe(false);
    expect(validateCourse({ ...base, duration: "abc" }).ok).toBe(false);
  });

  it("valide un titre de module", () => {
    expect(validateTitle("", "Le titre du module").ok).toBe(false);
    expect(validateTitle(" Intro ", "Le titre du module")).toEqual({ ok: true, value: "Intro" });
  });
});

describe("liens vidéo", () => {
  it("reconnaît YouTube (watch, youtu.be, embed) et renvoie une adresse d'intégration sans cookies", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://youtu.be/aqz-KE-bpKQ",
      "https://www.youtube.com/embed/aqz-KE-bpKQ",
    ]) {
      expect(parseVideoUrl(link)).toEqual({
        provider: "youtube",
        embedUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      });
    }
  });

  it("reconnaît Vimeo", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")?.embedUrl).toBe("https://player.vimeo.com/video/123456789");
  });

  it("refuse les autres sites, le http simple et les chaînes invalides", () => {
    expect(parseVideoUrl("https://exemple.fr/video.mp4")).toBeNull();
    expect(parseVideoUrl("http://www.youtube.com/watch?v=aqz-KE-bpKQ")).toBeNull();
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseVideoUrl("https://youtube.com.pirate.net/watch?v=aqz-KE-bpKQ")).toBeNull();
    expect(parseVideoUrl("pas un lien")).toBeNull();
  });
});

describe("validation d'un contenu", () => {
  it("valide un texte et une vidéo", () => {
    expect(validateContent({ type: "text", title: "T", body: "Bonjour", url: "" }).ok).toBe(true);
    expect(
      validateContent({ type: "video", title: "V", body: "", url: "https://youtu.be/aqz-KE-bpKQ" }).ok,
    ).toBe(true);
  });

  it("refuse texte vide, vidéo hors YouTube/Vimeo et type inconnu", () => {
    expect(validateContent({ type: "text", title: "T", body: " ", url: "" }).ok).toBe(false);
    expect(validateContent({ type: "video", title: "V", body: "", url: "https://exemple.fr/x" }).ok).toBe(false);
    expect(validateContent({ type: "script", title: "S", body: "x", url: "" }).ok).toBe(false);
  });
});

describe("validation d'un PDF", () => {
  it("accepte un PDF jusqu'à 10 Mo", () => {
    expect(validatePdf({ type: "application/pdf", size: 5_000_000 })).toBeNull();
  });
  it("refuse les autres types, les fichiers vides et trop lourds", () => {
    expect(validatePdf({ type: "image/png", size: 100 })).not.toBeNull();
    expect(validatePdf({ type: "application/pdf", size: 0 })).not.toBeNull();
    expect(validatePdf({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
  });
});

describe("format de durée", () => {
  it("affiche heures et minutes en français", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDuration(65)).toBe("1 h 05");
    expect(formatDuration(0)).toBe("Durée non précisée");
  });
});
