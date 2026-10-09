// Génération de l'attestation de fin de formation (PDF, 1 page A4) avec pdf-lib.
// ⚠️ À REVOIR AVANT MISE EN VENTE : mentions et formulation à valider par Mélissa (et, si besoin, un juriste / auditeur Qualiopi).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDateFr, formatSeconds } from "@/lib/tracking";

export type AttestationData = {
  organization: {
    name: string;
    activityNumber: string | null;
    signatoryName: string | null;
    signatoryTitle: string | null;
    primaryColor: string; // #rrggbb
    logo: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  };
  learnerName: string;
  courseTitle: string;
  plannedMinutes: number;
  timeSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
  objectives: string[];
  quizResults: { title: string; bestScore: number }[];
  issuedAt: Date;
};

const INK = rgb(0.09, 0.09, 0.09);
const GREY = rgb(0.4, 0.4, 0.43);

/** Remplace les caractères que la police standard ne sait pas écrire (emoji, etc.) par « ? ». */
export function safeText(font: PDFFont, text: string): string {
  return [...text.replace(/[\r\n\t]+/g, " ")]
    .map((char) => {
      try {
        font.encodeText(char);
        return char;
      } catch {
        return "?";
      }
    })
    .join("");
}

function wrap(font: PDFFont, size: number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of safeText(font, text).split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export async function generateAttestation(input: AttestationData): Promise<Uint8Array> {
  // Les textes démesurés sont tronqués pour que la page reste lisible et la signature visible.
  const data: AttestationData = {
    ...input,
    learnerName: clip(input.learnerName, 60),
    courseTitle: clip(input.courseTitle, 140),
    objectives: input.objectives.slice(0, 6).map((o) => clip(o, 130)),
    quizResults: input.quizResults.slice(0, 3).map((q) => ({ ...q, title: clip(q.title, 60) })),
  };
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexToRgb(data.organization.primaryColor);
  const { width, height } = page.getSize();
  const margin = 56;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const text = (s: string, x: number, size: number, font: PDFFont = regular, color = INK) =>
    page.drawText(safeText(font, s), { x, y, size, font, color });
  const centered = (s: string, size: number, font: PDFFont = regular, color = INK) => {
    const safe = safeText(font, s);
    page.drawText(safe, { x: (width - font.widthOfTextAtSize(safe, size)) / 2, y, size, font, color });
  };

  // Bandeau de couleur de l'organisme
  page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: accent });

  // En-tête : logo (facultatif) + nom de l'organisme
  y = height - 62;
  let headerX = margin;
  if (data.organization.logo) {
    const image = data.organization.logo.type === "png" ? await pdf.embedPng(data.organization.logo.bytes) : await pdf.embedJpg(data.organization.logo.bytes);
    const scaled = image.scaleToFit(48, 48);
    page.drawImage(image, { x: margin, y: y - scaled.height + 14, width: scaled.width, height: scaled.height });
    headerX = margin + scaled.width + 12;
  }
  text(data.organization.name, headerX, 15, bold);
  y -= 15;
  if (data.organization.activityNumber) {
    text(`N° de déclaration d'activité : ${data.organization.activityNumber}`, headerX, 9.5, regular, GREY);
  }

  // Titre
  y -= 70;
  centered("ATTESTATION DE FIN DE FORMATION", 20, bold, accent);
  y -= 16;
  page.drawLine({ start: { x: width / 2 - 40, y }, end: { x: width / 2 + 40, y }, thickness: 2, color: accent });

  // Corps
  y -= 44;
  centered(`${data.organization.name} atteste que`, 12, regular, GREY);
  y -= 34;
  centered(data.learnerName, 22, bold);
  y -= 30;
  centered("a suivi et terminé la formation", 12, regular, GREY);
  y -= 30;
  for (const line of wrap(bold, 17, data.courseTitle, contentWidth)) {
    centered(line, 17, bold);
    y -= 24;
  }

  // Informations
  y -= 14;
  const facts: [string, string][] = [
    ["Durée prévue", data.plannedMinutes ? formatSeconds(data.plannedMinutes * 60) : "Non précisée"],
    ["Temps de connexion enregistré", formatSeconds(data.timeSeconds)],
    ["Période", `du ${formatDateFr(data.startedAt)} au ${formatDateFr(data.completedAt)}`],
    ...data.quizResults.map((q): [string, string] => [`Évaluation : ${q.title}`, `réussie (meilleur score : ${q.bestScore} %)`]),
  ];
  for (const [label, value] of facts) {
    text(label, margin + 20, 10.5, regular, GREY);
    const labelLines = wrap(bold, 10.5, value, contentWidth - 230);
    labelLines.forEach((line, i) => {
      page.drawText(line, { x: margin + 230, y: y - i * 14, size: 10.5, font: bold, color: INK });
    });
    y -= Math.max(1, labelLines.length) * 14 + 6;
  }

  // Objectifs pédagogiques
  const objectives = data.objectives;
  if (objectives.length > 0) {
    y -= 12;
    text("Objectifs pédagogiques", margin + 20, 11, bold);
    y -= 18;
    for (const objective of objectives) {
      const lines = wrap(regular, 10.5, objective, contentWidth - 60);
      lines.forEach((line, i) => {
        if (i === 0) page.drawText("•", { x: margin + 22, y, size: 10.5, font: regular, color: accent });
        page.drawText(line, { x: margin + 38, y, size: 10.5, font: regular, color: INK });
        y -= 14;
      });
      y -= 2;
    }
  }

  drawSignature(page, { y: 190, margin, width, regular, bold, data });

  // Pied de page
  page.drawLine({ start: { x: margin, y: 64 }, end: { x: width - margin, y: 64 }, thickness: 0.5, color: GREY });
  page.drawText(safeText(regular, "Document de démonstration : mentions à valider avant tout usage officiel."), {
    x: margin, y: 48, size: 8, font: regular, color: GREY,
  });

  return pdf.save();
}

function drawSignature(
  page: PDFPage,
  o: { y: number; margin: number; width: number; regular: PDFFont; bold: PDFFont; data: AttestationData },
) {
  const { data, regular, bold, margin, width } = o;
  const draw = (s: string, x: number, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(safeText(font, s), { x, y, size, font, color });

  draw(`Fait le ${formatDateFr(data.issuedAt.toISOString())}`, margin + 20, o.y, 11, regular);
  const boxX = width - margin - 200;
  page.drawRectangle({ x: boxX, y: o.y - 78, width: 200, height: 96, borderColor: GREY, borderWidth: 0.6 });
  draw("Le responsable de l'organisme", boxX + 10, o.y + 4, 9, regular, GREY);
  if (data.organization.signatoryName) {
    draw(data.organization.signatoryName, boxX + 10, o.y - 12, 10.5, bold);
    if (data.organization.signatoryTitle) draw(data.organization.signatoryTitle, boxX + 10, o.y - 26, 9.5, regular, GREY);
  }
  draw("Signature et cachet", boxX + 10, o.y - 72, 8, regular, GREY);
}
