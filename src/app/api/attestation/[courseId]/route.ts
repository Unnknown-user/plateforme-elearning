import { generateAttestation } from "@/lib/attestation";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { slugify } from "@/lib/tracking";
import { loadTracking } from "@/lib/tracking-data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Télécharge le logo de l'organisme (uniquement depuis notre stockage) pour l'insérer dans le PDF. */
async function fetchLogo(logoUrl: string | null) {
  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/`;
  if (!logoUrl || !logoUrl.startsWith(allowedPrefix)) return null;
  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type");
    if (!res.ok || (type !== "image/png" && type !== "image/jpeg")) return null; // WebP non pris en charge par le PDF
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > 1_048_576) return null;
    return { bytes, type: type === "image/png" ? ("png" as const) : ("jpg" as const) };
  } catch {
    return null;
  }
}

// Apprenant : sa propre attestation. Personnel : celle d'un apprenant de son organisme (?learner=<id>).
// Dans tous les cas, uniquement si le parcours est terminé.
export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });

  const { courseId } = await params;
  if (!UUID.test(courseId)) return Response.json({ error: "Parcours introuvable." }, { status: 404 });

  let learnerId: string;
  if (user.role === "learner") {
    learnerId = user.id;
  } else {
    const requested = new URL(request.url).searchParams.get("learner") ?? "";
    if (!can(user.role, "reports:export") || !UUID.test(requested)) {
      return Response.json({ error: "Apprenant non précisé." }, { status: 400 });
    }
    learnerId = requested;
  }

  // La base ne renvoie que les données de l'organisme de la personne connectée.
  const data = await loadTracking({ learnerId, courseId });
  const row = data.rows[0];
  if (!row) return Response.json({ error: "Parcours ou apprenant introuvable." }, { status: 404 });
  if (row.tracking.status !== "completed") {
    return Response.json({ error: "L'attestation n'est disponible qu'une fois le parcours terminé." }, { status: 409 });
  }

  const bestByQuiz = new Map<string, number>();
  data.attempts
    .filter((a) => a.learnerId === learnerId)
    .forEach((a) => bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.scorePercent)));

  const { organization } = user;
  const pdf = await generateAttestation({
    organization: {
      name: organization.name,
      activityNumber: organization.activityNumber,
      signatoryName: organization.signatoryName,
      signatoryTitle: organization.signatoryTitle,
      primaryColor: organization.primaryColor,
      logo: await fetchLogo(organization.logoUrl),
    },
    learnerName: row.learner.fullName,
    courseTitle: row.course.title,
    plannedMinutes: row.course.durationMinutes,
    timeSeconds: row.tracking.timeSeconds,
    startedAt: row.tracking.startedAt,
    completedAt: row.tracking.completedAt,
    objectives: row.course.objectives,
    quizResults: row.course.quizzes.flatMap((q) =>
      bestByQuiz.has(q.id) ? [{ title: q.title, bestScore: bestByQuiz.get(q.id)! }] : [],
    ),
    issuedAt: new Date(),
  });

  const filename = `attestation-${slugify(row.learner.fullName)}-${slugify(row.course.title)}.pdf`;
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
