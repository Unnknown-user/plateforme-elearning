import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BookOpen, Clock, FileText, Layers, PlayCircle, Type } from "lucide-react";
import { formatDuration, parseVideoUrl } from "@/lib/content";
import type { ContentRow, CourseStatus, CourseSummary } from "@/lib/courses";
import { STATUS_LABELS, type TrackingStatus } from "@/lib/tracking";

// Teintes d'accompagnement : chaque carte mélange la couleur de l'organisme avec l'une d'elles,
// pour une interface vivante qui reste aux couleurs du client.
const ACCENTS = ["#7c3aed", "#059669", "#d97706", "#db2777", "#0891b2", "#4f46e5"];

export function StatusBadge({ status }: { status: CourseStatus }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-600" : "bg-amber-600"}`} />
      {published ? "Publié" : "Brouillon"}
    </span>
  );
}

const TONES = {
  brand: "bg-[color-mix(in_srgb,var(--brand)_14%,white)] text-zinc-900",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  violet: "bg-violet-100 text-violet-800",
} as const;

export function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      <div>
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
        <p className="text-sm text-zinc-600">{label}</p>
      </div>
    </div>
  );
}

export function CourseCard({
  course,
  href,
  index,
  showStatus,
  progress,
}: {
  course: CourseSummary;
  href: string;
  index: number;
  showStatus: boolean;
  progress?: { percent: number; status: TrackingStatus };
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const cover: CSSProperties = {
    background: `linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 40%, ${accent}))`,
  };
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div style={cover} className="relative flex h-28 items-end justify-between p-4">
        <BookOpen aria-hidden className="absolute right-4 top-3 h-16 w-16 text-white/25" />
        {showStatus && <StatusBadge status={course.status} />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-semibold leading-snug text-zinc-900">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-zinc-600">{course.description}</p>
        {progress && (
          <div className="mt-2 space-y-1.5">
            <TrackingBadge status={progress.status} />
            <ProgressBar percent={progress.percent} status={progress.status} />
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden /> {formatDuration(course.duration_minutes)}
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" aria-hidden /> {course.modules.length} module{course.modules.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

export const CONTENT_ICONS = { text: Type, video: PlayCircle, pdf: FileText } as const;
export const CONTENT_LABELS = { text: "Texte", video: "Vidéo", pdf: "PDF" } as const;

/** Affichage d'un contenu pour l'apprenant : texte en paragraphes, vidéo intégrée, lien vers le PDF. */
export function ContentView({ content, pdfUrl }: { content: ContentRow; pdfUrl?: string }) {
  const Icon = CONTENT_ICONS[content.type];
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5">
      <h4 className="mb-3 flex items-center gap-2 font-medium text-zinc-900">
        <Icon className="h-5 w-5 text-[var(--brand)]" aria-hidden /> {content.title}
      </h4>

      {content.type === "text" &&
        (content.body ?? "")
          .split(/\n{2,}/)
          .map((paragraph, i) => (
            <p key={i} className="mb-3 whitespace-pre-line leading-relaxed text-zinc-700 last:mb-0">
              {paragraph}
            </p>
          ))}

      {content.type === "video" &&
        (() => {
          const embed = content.url ? parseVideoUrl(content.url) : null;
          return embed ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-zinc-900">
              <iframe
                src={embed.embedUrl}
                title={content.title}
                className="h-full w-full"
                allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Vidéo indisponible.</p>
          );
        })()}

      {content.type === "pdf" &&
        (pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)]"
          >
            <FileText className="h-4 w-4" aria-hidden /> Ouvrir le document PDF
          </a>
        ) : (
          <p className="text-sm text-zinc-600">Document indisponible.</p>
        ))}
    </article>
  );
}

const STATUS_STYLES = {
  not_started: "bg-zinc-100 text-zinc-700",
  in_progress: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
} as const;

export function TrackingBadge({ status }: { status: TrackingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ProgressBar({ percent, status }: { percent: number; status: TrackingStatus }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression"
        className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200"
      >
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full ${status === "completed" ? "bg-emerald-500" : "bg-[var(--brand)]"}`}
        />
      </div>
      <span className="w-10 text-right text-xs font-medium text-zinc-700">{percent} %</span>
    </div>
  );
}
