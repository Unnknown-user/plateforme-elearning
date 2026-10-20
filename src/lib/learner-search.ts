// Recherche d'apprenants par nom : insensible aux majuscules et aux accents, sur le nom complet.
// Logique pure, testée dans learner-search.test.ts.

export type Searchable = { fullName: string };

/** « Léa  FONTAINE » -> « lea fontaine » : sans accents, en minuscules, espaces simplifiés. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Garde les personnes dont le nom contient chaque mot saisi (« fon lé » retrouve « Léa Fontaine »). */
export function filterLearners<T extends Searchable>(learners: readonly T[], query: string): T[] {
  const words = normalizeName(query).split(" ").filter(Boolean);
  if (words.length === 0) return [...learners];
  return learners.filter((learner) => {
    const name = normalizeName(learner.fullName);
    return words.every((word) => name.includes(word));
  });
}

/** Tri par nom de famille (dernier mot du nom complet), puis par prénom. */
export function sortByFamilyName<T extends Searchable>(learners: readonly T[]): T[] {
  const key = (fullName: string) => {
    const parts = normalizeName(fullName).split(" ");
    return [parts[parts.length - 1] ?? "", parts.slice(0, -1).join(" ")] as const;
  };
  return [...learners].sort((a, b) => {
    const [familyA, firstA] = key(a.fullName);
    const [familyB, firstB] = key(b.fullName);
    return familyA.localeCompare(familyB, "fr") || firstA.localeCompare(firstB, "fr");
  });
}
