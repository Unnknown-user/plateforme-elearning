// Règles de saisie des parcours, modules et contenus. Logique pure, testée dans content.test.ts.

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const TEXT_BODY_MAX = 20000;
export const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export type CourseInput = { title: string; description: string; objectives: string; durationMinutes: number };

export function validateCourse(raw: {
  title: string;
  description: string;
  objectives: string;
  duration: string;
}): Validation<CourseInput> {
  const title = raw.title.trim();
  const description = raw.description.trim();
  const objectives = raw.objectives.trim();
  if (!title) return { ok: false, error: "Le titre du parcours est obligatoire." };
  if (title.length > TITLE_MAX) return { ok: false, error: `Le titre ne doit pas dépasser ${TITLE_MAX} caractères.` };
  if (description.length > DESCRIPTION_MAX || objectives.length > DESCRIPTION_MAX) {
    return { ok: false, error: `Les textes ne doivent pas dépasser ${DESCRIPTION_MAX} caractères.` };
  }
  const durationMinutes = raw.duration.trim() === "" ? 0 : Number(raw.duration);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 0 || durationMinutes > 100000) {
    return { ok: false, error: "La durée doit être un nombre entier de minutes." };
  }
  return { ok: true, value: { title, description, objectives, durationMinutes } };
}

export function validateTitle(raw: string, label: string): Validation<string> {
  const title = raw.trim();
  if (!title) return { ok: false, error: `${label} est obligatoire.` };
  if (title.length > TITLE_MAX) return { ok: false, error: `${label} ne doit pas dépasser ${TITLE_MAX} caractères.` };
  return { ok: true, value: title };
}

export type VideoEmbed = { provider: "youtube" | "vimeo"; embedUrl: string };

/** Transforme un lien YouTube ou Vimeo en adresse d'intégration. Retourne null pour tout autre lien. */
export function parseVideoUrl(raw: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  let youtubeId: string | null = null;
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") youtubeId = url.searchParams.get("v");
    else if (url.pathname.startsWith("/embed/")) youtubeId = url.pathname.split("/")[2] ?? null;
  } else if (host === "youtu.be") {
    youtubeId = url.pathname.slice(1) || null;
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  }

  if (host === "vimeo.com") {
    const id = url.pathname.slice(1);
    if (/^\d{5,12}$/.test(id)) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}

export type ContentInput =
  | { type: "text"; title: string; body: string }
  | { type: "video"; title: string; url: string };

export function validateContent(raw: { type: string; title: string; body: string; url: string }): Validation<ContentInput> {
  const title = validateTitle(raw.title, "Le titre du contenu");
  if (!title.ok) return title;
  if (raw.type === "text") {
    const body = raw.body.trim();
    if (!body) return { ok: false, error: "Le texte est obligatoire." };
    if (body.length > TEXT_BODY_MAX) return { ok: false, error: "Le texte est trop long." };
    return { ok: true, value: { type: "text", title: title.value, body } };
  }
  if (raw.type === "video") {
    if (!parseVideoUrl(raw.url)) {
      return { ok: false, error: "Le lien doit être une adresse YouTube ou Vimeo (https)." };
    }
    return { ok: true, value: { type: "video", title: title.value, url: raw.url.trim() } };
  }
  return { ok: false, error: "Type de contenu inconnu." };
}

/** Retourne un message d'erreur, ou null si le PDF est accepté. */
export function validatePdf(file: { type: string; size: number }): string | null {
  if (file.type !== "application/pdf") return "Le fichier doit être un PDF.";
  if (file.size > PDF_MAX_BYTES) return "Le PDF ne doit pas dépasser 10 Mo.";
  if (file.size === 0) return "Le fichier est vide.";
  return null;
}

/** 90 → « 1 h 30 », 45 → « 45 min », 0 → « Durée non précisée ». */
export function formatDuration(minutes: number): string {
  if (!minutes) return "Durée non précisée";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
