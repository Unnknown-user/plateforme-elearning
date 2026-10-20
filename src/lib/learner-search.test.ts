import { describe, expect, it } from "vitest";
import { filterLearners, formatFamilyFirst, normalizeName, sortByFamilyName } from "./learner-search";

const learners = [
  { id: "1", fullName: "Léa Fontaine" },
  { id: "2", fullName: "Thomas Girard" },
  { id: "3", fullName: "Camille Petit" },
  { id: "4", fullName: "Inès Caron" },
];

describe("normalizeName", () => {
  it("retire les accents, les majuscules et les espaces en trop", () => {
    expect(normalizeName("  Léa   FONTAINE ")).toBe("lea fontaine");
  });
});

describe("filterLearners", () => {
  it("renvoie tout le monde quand la recherche est vide", () => {
    expect(filterLearners(learners, "")).toHaveLength(4);
    expect(filterLearners(learners, "   ")).toHaveLength(4);
  });

  it("retrouve par nom de famille, sans tenir compte des accents ni de la casse", () => {
    expect(filterLearners(learners, "fontaine").map((l) => l.id)).toEqual(["1"]);
    expect(filterLearners(learners, "LEA").map((l) => l.id)).toEqual(["1"]);
    expect(filterLearners(learners, "ines").map((l) => l.id)).toEqual(["4"]);
  });

  it("accepte un début de nom et plusieurs mots dans n'importe quel ordre", () => {
    expect(filterLearners(learners, "gir").map((l) => l.id)).toEqual(["2"]);
    expect(filterLearners(learners, "petit camille").map((l) => l.id)).toEqual(["3"]);
  });

  it("ne renvoie personne quand rien ne correspond", () => {
    expect(filterLearners(learners, "zzz")).toEqual([]);
  });
});

describe("sortByFamilyName", () => {
  it("trie par nom de famille et ne modifie pas la liste d'origine", () => {
    const sorted = sortByFamilyName(learners);
    expect(sorted.map((l) => l.fullName)).toEqual(["Inès Caron", "Léa Fontaine", "Thomas Girard", "Camille Petit"]);
    expect(learners[0]!.fullName).toBe("Léa Fontaine");
  });
});

describe("formatFamilyFirst", () => {
  it("met le nom de famille en majuscules, en premier", () => {
    expect(formatFamilyFirst("Léa Fontaine")).toBe("FONTAINE Léa");
    expect(formatFamilyFirst("  Jean  Pierre  Durand ")).toBe("DURAND Jean Pierre");
  });

  it("gère un nom en un seul mot", () => {
    expect(formatFamilyFirst("Madonna")).toBe("MADONNA");
  });
});
