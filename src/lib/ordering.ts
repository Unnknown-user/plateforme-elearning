// Réordonnancement : déplacer un élément d'un cran vers le haut ou vers le bas.
// Logique pure (testée dans ordering.test.ts) ; la renumérotation en base est faite côté serveur.

export type Direction = "up" | "down";

export function isDirection(value: string): value is Direction {
  return value === "up" || value === "down";
}

/** Retourne une nouvelle liste où l'élément d'indice `index` a été échangé avec son voisin. */
export function moveItem<T>(items: readonly T[], index: number, direction: Direction): T[] {
  const copy = [...items];
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= copy.length || target < 0 || target >= copy.length) return copy;
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}
