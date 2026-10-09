// Règles de la marque blanche : validation du nom, de la couleur et du logo d'un organisme.
// Logique pure (sans base de données) pour pouvoir la tester facilement.

import type { Validation } from "@/lib/content";

export const DEFAULT_PRIMARY_COLOR = "#1d4ed8";
export const NAME_MAX_LENGTH = 80;
export const LOGO_MAX_BYTES = 1_048_576; // 1 Mo

// Formats acceptés pour le logo. Le SVG est volontairement exclu : il peut contenir du code actif.
export const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export type BrandingResult =
  | { ok: true; value: { name: string; color: string } }
  | { ok: false; error: string };

export function validateBranding(input: { name: string; color: string }): BrandingResult {
  const name = input.name.trim();
  const color = input.color.trim().toLowerCase();
  if (!name) return { ok: false, error: "Le nom de l'organisme est obligatoire." };
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `Le nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères.` };
  }
  if (!isHexColor(color)) return { ok: false, error: "La couleur n'est pas valide." };
  return { ok: true, value: { name, color } };
}

/** Retourne un message d'erreur, ou null si le fichier est accepté. */
export function validateLogo(file: { type: string; size: number }): string | null {
  if (!(file.type in LOGO_EXTENSIONS)) return "Le logo doit être une image PNG, JPEG ou WebP.";
  if (file.size > LOGO_MAX_BYTES) return "Le logo ne doit pas dépasser 1 Mo.";
  return null;
}

function luminance(hex: string): number {
  const channel = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Couleur de texte (blanc ou quasi noir) la plus lisible sur la couleur d'organisme donnée (norme WCAG). */
export function contrastColor(background: string): "#ffffff" | "#171717" {
  return luminance(background) <= 0.179 ? "#ffffff" : "#171717";
}

/** Initiales (2 lettres maximum) pour l'avatar d'une personne ou d'un organisme sans logo. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase());
  return (letters.length > 1 ? letters[0]! + letters[1]! : (letters[0] ?? "?")).slice(0, 2);
}

export type LegalInfo = { activityNumber: string | null; signatoryName: string | null; signatoryTitle: string | null };

/** Mentions légales de l'attestation : champs facultatifs, vides = absents. */
export function validateLegal(raw: { activityNumber: string; signatoryName: string; signatoryTitle: string }): Validation<LegalInfo> {
  const clean = (value: string) => value.trim().replace(/\s+/g, " ");
  const activityNumber = clean(raw.activityNumber);
  const signatoryName = clean(raw.signatoryName);
  const signatoryTitle = clean(raw.signatoryTitle);
  if (activityNumber.length > 60) return { ok: false, error: "Le numéro de déclaration d'activité est trop long (60 caractères maximum)." };
  if (signatoryName.length > 80 || signatoryTitle.length > 80) {
    return { ok: false, error: "Le nom et la fonction du signataire sont limités à 80 caractères." };
  }
  return {
    ok: true,
    value: {
      activityNumber: activityNumber || null,
      signatoryName: signatoryName || null,
      signatoryTitle: signatoryTitle || null,
    },
  };
}
