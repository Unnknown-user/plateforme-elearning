// Tests réels des inscriptions : un apprenant ne voit et ne travaille que les parcours publiés
// auxquels il est inscrit. Crée un parcours temporaire (supprimé à la fin).
// Lancer avec : npm run test:isolation   (nécessite 0008_enrollments.sql appliqué)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signIn } from "./auth-helper";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ORG = "a0000000-0000-4000-8000-000000000001";
const LEA = "a1000000-0000-4000-8000-000000000003";
const THOMAS = "a1000000-0000-4000-8000-000000000004";

type Row = Record<string, unknown> & { id: string };

const headers = (token: string) => ({
  apikey: anonKey!,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

async function insertRaw(table: string, token: string, rows: object | object[]) {
  return fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: headers(token), body: JSON.stringify(rows) });
}
async function insert(table: string, token: string, rows: object | object[]): Promise<Row[]> {
  const res = await insertRaw(table, token, rows);
  if (!res.ok) throw new Error(`Insertion ${table} refusée : ${await res.text()}`);
  return (await res.json()) as Row[];
}
async function select(path: string, token: string): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Lecture refusée (${res.status})`);
  return (await res.json()) as Row[];
}
async function remove(path: string, token: string): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, { method: "DELETE", headers: headers(token) });
  return res.ok ? ((await res.json()) as Row[]) : [];
}
async function patch(path: string, token: string, changes: object) {
  await fetch(`${url}/rest/v1/${path}`, { method: "PATCH", headers: headers(token), body: JSON.stringify(changes) });
}
async function rpc(name: string, token: string, args: object) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: headers(token), body: JSON.stringify(args) });
  return { ok: res.ok, text: await res.text() };
}

describe.skipIf(!url || !anonKey)("inscriptions : accès des apprenants (base réelle)", () => {
  let trainer: string, admin: string, lea: string, thomas: string, otherAdmin: string;
  let courseId = "", moduleId = "", contentId = "", quizId = "";

  const seesCourse = async (token: string) => (await select(`courses?select=id&id=eq.${courseId}`, token)).length === 1;

  beforeAll(async () => {
    [trainer, admin, lea, thomas, otherAdmin] = await Promise.all([
      signIn("formateur@horizon.test"),
      signIn("admin@horizon.test"),
      signIn("apprenant@horizon.test"),
      signIn("thomas@horizon.test"),
      signIn("admin@lumiere.test"),
    ]);
    const [course] = await insert("courses", trainer, { organization_id: ORG, title: "Parcours de test inscriptions", status: "published" });
    courseId = course!.id;
    const [module] = await insert("modules", trainer, { organization_id: ORG, course_id: courseId, title: "Module", position: 1 });
    moduleId = module!.id;
    const [content] = await insert("contents", trainer, { organization_id: ORG, module_id: moduleId, type: "text", title: "Texte", body: "x", position: 1 });
    contentId = content!.id;
    const [quiz] = await insert("quizzes", trainer, { organization_id: ORG, module_id: moduleId, title: "Quiz", pass_threshold: 50 });
    quizId = quiz!.id;
  });

  afterAll(async () => {
    if (courseId) await remove(`courses?id=eq.${courseId}`, admin);
  });

  it("sans inscription, un apprenant ne voit rien : ni parcours, ni module, ni contenu, ni quiz", async () => {
    expect(await seesCourse(lea)).toBe(false);
    expect(await select(`modules?select=id&course_id=eq.${courseId}`, lea)).toEqual([]);
    expect(await select(`contents?select=id&id=eq.${contentId}`, lea)).toEqual([]);
    expect(await select(`quizzes?select=id&id=eq.${quizId}`, lea)).toEqual([]);
  });

  it("sans inscription, un apprenant ne peut ni terminer un contenu, ni compter du temps, ni passer le quiz", async () => {
    expect((await rpc("mark_content_done", lea, { p_content_id: contentId, p_done: true })).text).toContain("content_not_found");
    expect((await rpc("track_course_time", lea, { p_course_id: courseId, p_seconds: 30 })).text).toContain("course_not_found");
    expect((await rpc("submit_quiz_attempt", lea, { p_quiz_id: quizId, p_answers: {} })).text).toContain("quiz_not_found");
  });

  it("le personnel voit toujours le parcours, inscrits ou non", async () => {
    expect(await seesCourse(trainer)).toBe(true);
    expect(await seesCourse(admin)).toBe(true);
  });

  it("l'apprenant ne peut pas s'inscrire lui-même ni inscrire quelqu'un d'autre", async () => {
    expect((await insertRaw("enrollments", lea, { organization_id: ORG, course_id: courseId, learner_id: LEA })).ok).toBe(false);
    expect((await insertRaw("enrollments", lea, { organization_id: ORG, course_id: courseId, learner_id: THOMAS })).ok).toBe(false);
    expect(await seesCourse(lea)).toBe(false);
  });

  it("un autre organisme ne peut inscrire personne dans ce parcours", async () => {
    expect((await insertRaw("enrollments", otherAdmin, { organization_id: ORG, course_id: courseId, learner_id: LEA })).ok).toBe(false);
    // ... ni se faire passer pour son propre organisme avec un parcours d'Horizon.
    const LUMIERE = "b0000000-0000-4000-8000-000000000002";
    expect((await insertRaw("enrollments", otherAdmin, { organization_id: LUMIERE, course_id: courseId, learner_id: LEA })).ok).toBe(false);
  });

  it("on ne peut inscrire qu'un apprenant (pas un formateur)", async () => {
    const [staff] = await select("profiles?select=id&role=eq.trainer", admin);
    expect((await insertRaw("enrollments", admin, { organization_id: ORG, course_id: courseId, learner_id: staff!.id })).ok).toBe(false);
  });

  it("une fois inscrite, Léa accède au parcours ; Thomas, non inscrit, reste dehors", async () => {
    await insert("enrollments", trainer, { organization_id: ORG, course_id: courseId, learner_id: LEA, enrolled_by: null });
    expect(await seesCourse(lea)).toBe(true);
    expect(await select(`modules?select=id&course_id=eq.${courseId}`, lea)).toHaveLength(1);
    expect(await select(`contents?select=id&id=eq.${contentId}`, lea)).toHaveLength(1);
    expect(await select(`quizzes?select=id&id=eq.${quizId}`, lea)).toHaveLength(1);
    expect(await seesCourse(thomas)).toBe(false);

    expect((await rpc("mark_content_done", lea, { p_content_id: contentId, p_done: true })).ok).toBe(true);
    expect((await rpc("track_course_time", lea, { p_course_id: courseId, p_seconds: 30 })).ok).toBe(true);
    // Le quiz est vide : l'erreur « empty_quiz » prouve que l'accès, lui, est accordé.
    expect((await rpc("submit_quiz_attempt", lea, { p_quiz_id: quizId, p_answers: {} })).text).toContain("empty_quiz");
  });

  it("Léa ne voit que sa propre inscription ; le personnel voit celles de l'organisme", async () => {
    await insert("enrollments", trainer, { organization_id: ORG, course_id: courseId, learner_id: THOMAS });
    const mine = await select(`enrollments?select=learner_id&course_id=eq.${courseId}`, lea);
    expect(mine.map((e) => e.learner_id)).toEqual([LEA]);
    expect(await select(`enrollments?select=learner_id&course_id=eq.${courseId}`, trainer)).toHaveLength(2);
    expect(await select(`enrollments?select=learner_id&course_id=eq.${courseId}`, otherAdmin)).toEqual([]);
  });

  it("l'apprenant ne peut pas se désinscrire ni désinscrire un autre ; un autre organisme non plus", async () => {
    expect(await remove(`enrollments?course_id=eq.${courseId}&learner_id=eq.${LEA}`, lea)).toEqual([]);
    expect(await remove(`enrollments?course_id=eq.${courseId}&learner_id=eq.${THOMAS}`, lea)).toEqual([]);
    expect(await remove(`enrollments?course_id=eq.${courseId}`, otherAdmin)).toEqual([]);
    expect(await seesCourse(lea)).toBe(true);
  });

  it("parcours en brouillon : même inscrit, l'apprenant ne le voit pas", async () => {
    await patch(`courses?id=eq.${courseId}`, trainer, { status: "draft" });
    expect(await seesCourse(lea)).toBe(false);
    await patch(`courses?id=eq.${courseId}`, trainer, { status: "published" });
    expect(await seesCourse(lea)).toBe(true);
  });

  it("désinscrire retire l'accès mais conserve les traces, visibles du personnel", async () => {
    expect(await remove(`enrollments?course_id=eq.${courseId}&learner_id=eq.${LEA}`, trainer)).toHaveLength(1);
    expect(await seesCourse(lea)).toBe(false);
    expect((await rpc("mark_content_done", lea, { p_content_id: contentId, p_done: false })).text).toContain("content_not_found");
    expect(await select(`content_completions?select=content_id&learner_id=eq.${LEA}&content_id=eq.${contentId}`, trainer)).toHaveLength(1);
    expect(await select(`course_time?select=seconds&learner_id=eq.${LEA}&course_id=eq.${courseId}`, trainer)).toHaveLength(1);
  });
});
