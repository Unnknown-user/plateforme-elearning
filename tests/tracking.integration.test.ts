// Tests réels du suivi : contenus terminés, temps passé (plafonné), confidentialité des traces.
// Le test crée son propre parcours temporaire (supprimé à la fin, avec toutes ses traces).
// Lancer avec : npm run test:isolation   (nécessite 0005_tracking.sql appliqué)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signIn } from "./auth-helper";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ORG = "a0000000-0000-4000-8000-000000000001";

type Row = Record<string, unknown> & { id: string };

const headers = (token: string) => ({
  apikey: anonKey!,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

async function insert(table: string, token: string, rows: object | object[]): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: headers(token), body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`Insertion ${table} refusée : ${await res.text()}`);
  return (await res.json()) as Row[];
}

async function select(path: string, token: string): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Lecture refusée (${res.status})`);
  return (await res.json()) as Row[];
}

async function rpc(name: string, token: string, body: object) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: headers(token), body: JSON.stringify(body) });
  const text = await res.text();
  return { ok: res.ok, body: text ? (JSON.parse(text) as unknown) : null };
}

const errorOf = (r: { body: unknown }) => String((r.body as { message?: string } | null)?.message ?? "");

describe.skipIf(!url || !anonKey)("suivi : contenus terminés, temps, confidentialité (base réelle)", () => {
  let trainer: string, admin: string, learner: string, otherLearner: string, otherOrgAdmin: string;
  let courseId = "";
  let contentIds: string[] = [];
  const LEA = "a1000000-0000-4000-8000-000000000003";

  beforeAll(async () => {
    [trainer, admin, learner, otherLearner, otherOrgAdmin] = await Promise.all([
      signIn("formateur@horizon.test"),
      signIn("admin@horizon.test"),
      signIn("apprenant@horizon.test"),
      signIn("apprenant@lumiere.test"),
      signIn("admin@lumiere.test"),
    ]);
    const [course] = await insert("courses", trainer, { organization_id: ORG, title: "Parcours de test suivi", status: "published" });
    courseId = course!.id;
    // Depuis l'étape 10, un apprenant ne voit un parcours que s'il y est inscrit.
    await insert("enrollments", trainer, { organization_id: ORG, course_id: courseId, learner_id: LEA });
    const [module] = await insert("modules", trainer, { organization_id: ORG, course_id: courseId, title: "Module", position: 1 });
    const contents = await insert("contents", trainer, [
      { organization_id: ORG, module_id: module!.id, type: "text", title: "Un", body: "x", position: 1 },
      { organization_id: ORG, module_id: module!.id, type: "text", title: "Deux", body: "y", position: 2 },
    ]);
    contentIds = contents.map((c) => c.id);
  });

  afterAll(async () => {
    if (courseId) await fetch(`${url}/rest/v1/courses?id=eq.${courseId}`, { method: "DELETE", headers: headers(admin) });
  });

  it("un apprenant marque un contenu comme terminé (et l'opération est répétable sans doublon)", async () => {
    expect((await rpc("mark_content_done", learner, { p_content_id: contentIds[0], p_done: true })).ok).toBe(true);
    expect((await rpc("mark_content_done", learner, { p_content_id: contentIds[0], p_done: true })).ok).toBe(true);
    const mine = await select(`content_completions?content_id=eq.${contentIds[0]}`, learner);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.learner_id).toBe(LEA);
  });

  it("l'apprenant peut annuler, le formateur voit les traces de l'organisme", async () => {
    await rpc("mark_content_done", learner, { p_content_id: contentIds[1], p_done: true });
    const asStaff = await select(`content_completions?content_id=in.(${contentIds.join(",")})&select=content_id,learner_id`, trainer);
    expect(asStaff).toHaveLength(2);

    await rpc("mark_content_done", learner, { p_content_id: contentIds[1], p_done: false });
    expect(await select(`content_completions?content_id=eq.${contentIds[1]}`, learner)).toEqual([]);
  });

  it("formateur, autre organisme, brouillon et visiteur ne peuvent pas marquer un contenu", async () => {
    expect(errorOf(await rpc("mark_content_done", trainer, { p_content_id: contentIds[0], p_done: true }))).toContain("not_allowed");
    expect(errorOf(await rpc("mark_content_done", otherLearner, { p_content_id: contentIds[0], p_done: true }))).toContain("content_not_found");
    expect((await rpc("mark_content_done", anonKey!, { p_content_id: contentIds[0], p_done: true })).ok).toBe(false);

    await fetch(`${url}/rest/v1/courses?id=eq.${courseId}`, { method: "PATCH", headers: headers(trainer), body: JSON.stringify({ status: "draft" }) });
    expect(errorOf(await rpc("mark_content_done", learner, { p_content_id: contentIds[0], p_done: true }))).toContain("content_not_found");
    await fetch(`${url}/rest/v1/courses?id=eq.${courseId}`, { method: "PATCH", headers: headers(trainer), body: JSON.stringify({ status: "published" }) });
  });

  it("le temps passé est plafonné : on ne peut pas se déclarer des heures", async () => {
    const first = await rpc("track_course_time", learner, { p_course_id: courseId, p_seconds: 3600 });
    expect(first.ok).toBe(true);
    expect(first.body).toBe(30); // premier signal : 30 s maximum

    const second = await rpc("track_course_time", learner, { p_course_id: courseId, p_seconds: 3600 });
    expect(second.ok).toBe(true);
    // Presque aucun temps ne s'est écoulé entre les deux appels : au plus quelques secondes de plus.
    expect(second.body as number).toBeGreaterThanOrEqual(30);
    expect(second.body as number).toBeLessThanOrEqual(40);

    const negative = await rpc("track_course_time", learner, { p_course_id: courseId, p_seconds: -500 });
    expect(negative.body as number).toBeLessThanOrEqual(second.body as number);
  });

  it("temps : formateur, autre organisme et parcours inconnu refusés", async () => {
    expect(errorOf(await rpc("track_course_time", trainer, { p_course_id: courseId, p_seconds: 30 }))).toContain("not_allowed");
    expect(errorOf(await rpc("track_course_time", otherLearner, { p_course_id: courseId, p_seconds: 30 }))).toContain("course_not_found");
    expect(
      errorOf(await rpc("track_course_time", learner, { p_course_id: "00000000-0000-4000-8000-000000000000", p_seconds: 30 })),
    ).toContain("course_not_found");
  });

  it("aucune écriture directe : ni ajout, ni modification, ni suppression par l'apprenant", async () => {
    const forgedTime = await fetch(`${url}/rest/v1/course_time`, {
      method: "POST", headers: headers(learner),
      body: JSON.stringify({ learner_id: LEA, course_id: courseId, organization_id: ORG, seconds: 99999 }),
    });
    expect(forgedTime.ok).toBe(false);

    const tamper = await fetch(`${url}/rest/v1/course_time?course_id=eq.${courseId}`, {
      method: "PATCH", headers: headers(learner), body: JSON.stringify({ seconds: 99999 }),
    });
    expect(tamper.ok ? ((await tamper.json()) as Row[]) : []).toEqual([]);

    const forgedDone = await fetch(`${url}/rest/v1/content_completions`, {
      method: "POST", headers: headers(learner),
      body: JSON.stringify({ learner_id: LEA, content_id: contentIds[1], organization_id: ORG }),
    });
    expect(forgedDone.ok).toBe(false);
  });

  it("un apprenant ne voit que ses propres traces ; un autre organisme n'en voit aucune", async () => {
    const mine = await select("content_completions?select=learner_id", learner);
    expect(mine.every((r) => r.learner_id === LEA)).toBe(true);

    const everyone = await select("content_completions?select=learner_id", admin);
    expect(new Set(everyone.map((r) => r.learner_id)).size).toBeGreaterThan(1);

    expect(await select("content_completions?select=learner_id", otherLearner)).toSatisfy(
      (rows: Row[]) => rows.every((r) => r.learner_id !== LEA),
    );
    const crossOrg = await select(`course_time?course_id=eq.${courseId}`, otherOrgAdmin);
    expect(crossOrg).toEqual([]);
  });
});
