// Règles de saisie d'un groupe. Logique pure, testée dans groups-rules.test.ts.
import type { Validation } from "@/lib/content";

export const GROUP_NAME_MAX = 80;

export function validateGroupName(raw: string): Validation<string> {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Le nom du groupe est obligatoire." };
  if (name.length > GROUP_NAME_MAX) return { ok: false, error: `Le nom ne doit pas dépasser ${GROUP_NAME_MAX} caractères.` };
  return { ok: true, value: name };
}
