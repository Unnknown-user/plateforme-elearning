// Export CSV pour Excel en français : séparateur « ; », UTF-8 avec BOM, protection contre l'injection de formules.

export type CsvValue = string | number | null;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  // Une cellule texte qui commence par = + - @ serait interprétée comme une formule par Excel :
  // on la neutralise en la faisant précéder d'une apostrophe.
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
