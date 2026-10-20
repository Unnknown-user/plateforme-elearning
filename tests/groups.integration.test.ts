// Tests réels des groupes : accès par groupe, droits, isolation entre organismes.
// Crée un parcours et des groupes temporaires (supprimés à la fin).
// Lancer avec : npm run test:isolation   (nécessite 0010_groups.sql appliqué)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signIn } from "./auth-helper";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ORG = "a0000000-0000-4000-8000-000000000001";
const LUMIERE = "b0000000-0000-4000-8000-000000000002";
const LEA = "a1000000-0000-4000-8000-000000000003";
const THOMAS = "a1000000-0000-4000-8000-000000000004";

type Row = Record<string, unknown> & { id: string };

const headers = (token: string) => ({
  apikey: anonKey!,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

const insertRaw = (table: string, token: string, rows: object | object[]) =>
  fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: headers(token), body: JSON.stringify(rows) });
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
async function rpc(name: string, token: string, args: object = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: headers(token), body: JSON.stringify(args) });
  return { ok: res.ok, text: await res.text() };
}

describe.skipIf(!url || !anonKey)("groupes : accès par groupe, droits, isolation (base réelle)", () => {
  let trainer: string, admin: string, lea: string, thomas: string, otherAdmin: string;
  let courseId = "", contentId = "", groupId = "", otherGroupId = "";
  const created: string[] = [];

  const seesCourse = async (token: string) => (await select(`courses?select=id&id=eq.${courseId}`, token)).length === 1;
  const effective = async (token: string) => {
    const res = await rpc("effective_enrollments", token);
    return (JSON.parse(res.text) as { course_id: string; learner_id: string }[]).filter((e) => e.course_id === courseId).map((e) => e.learner_id).sort();
  };

  beforeAll(async () => {
    [trainer, admin, lea, thomas, otherAdmin] = await Promise.all([
      signIn("formateur@horizon.test"),
      signIn("admin@horizon.test"),
      signIn("apprenant@horizon.test"),
      signIn("thomas@horizon.test"),
      signIn("admin@lumiere.test"),
    ]);
    const [course] = await insert("courses", trainer, { organization_id: ORG, title: "Parcours de test groupes", status: "published" });
    courseId = course!.id;
    const [module] = await insert("modules", trainer, { organization_id: ORG, course_id: courseId, title: "Module", position: 1 });
    const [content] = await insert("contents", trainer, { organization_id: ORG, module_id: module!.id, type: "text", title: "Texte", body: "x", position: 1 });
    contentId = content!.id;
    const [group] = await insert("groups", trainer, { organization_id: ORG, name: "Groupe de test " + Date.now() });
    groupId = group!.id;
    const [other] = await insert("groups", otherAdmin, { organization_id: LUMIERE, name: "Groupe Lumière test " + Date.now() });
    otherGroupId = other!.id;
  });

  afterAll(async () => {
    if (courseId) await remove(`courses?id=eq.${courseId}`, admin);
    if (groupId) await remove(`groups?id=eq.${groupId}`, admin);
    if (otherGroupId) await remove(`groups?id=eq.${otherGroupId}`, otherAdmin);
    for (const id of created) await remove(`groups?id=eq.${id}`, admin);
  });

  it("membre d'un groupe non inscrit au parcours : pas d'accès ; groupe inscrit : accès, sans inscription individuelle", async () => {
    await insert("group_members", trainer, { group_id: groupId, learner_id: LEA, organization_id: ORG });
    expect(await seesCourse(lea)).toBe(false);

    await insert("group_enrollments", trainer, { group_id: groupId, course_id: courseId, organization_id: ORG });
    expect(await seesCourse(lea)).toBe(true);
    expect(await select(`contents?select=id&id=eq.${contentId}`, lea)).toHaveLength(1);
    expect((await rpc("mark_content_done", lea, { p_content_id: contentId, p_done: true })).ok).toBe(true);
    expect((await rpc("track_course_time", lea, { p_course_id: courseId, p_seconds: 30 })).ok).toBe(true);
    expect(await select(`enrollments?select=id&course_id=eq.${courseId}`, trainer)).toEqual([]);
  });

  it("un apprenant hors du groupe n'a pas accès", async () => {
    expect(await seesCourse(thomas)).toBe(false);
    expect((await rpc("mark_content_done", thomas, { p_content_id: contentId, p_done: true })).text).toContain("content_not_found");
  });

  it("ajouter un membre lui donne accès tout de suite ; l'inscription effective liste groupe et individuel", async () => {
    await insert("group_members", trainer, { group_id: groupId, learner_id: THOMAS, organization_id: ORG });
    expect(await seesCourse(thomas)).toBe(true);
    expect(await effective(trainer)).toEqual([LEA, THOMAS].sort());
    // Un apprenant ne reçoit que ses propres inscriptions effectives.
    expect(await effective(lea)).toEqual([LEA]);
    expect(await effective(otherAdmin)).toEqual([]);
  });

  it("retirer un membre retire l'accès, mais pas ses traces", async () => {
    expect(await remove(`group_members?group_id=eq.${groupId}&learner_id=eq.${THOMAS}`, trainer)).toHaveLength(1);
    expect(await seesCourse(thomas)).toBe(false);
    expect(await seesCourse(lea)).toBe(true);
    expect(await select(`content_completions?select=content_id&learner_id=eq.${LEA}&content_id=eq.${contentId}`, trainer)).toHaveLength(1);
  });

  it("accès individuel ET par groupe : retirer l'un laisse l'autre", async () => {
    await insert("enrollments", trainer, { organization_id: ORG, course_id: courseId, learner_id: LEA });
    expect(await remove(`group_enrollments?group_id=eq.${groupId}&course_id=eq.${courseId}`, trainer)).toHaveLength(1);
    expect(await seesCourse(lea)).toBe(true); // reste l'inscription individuelle
    expect(await remove(`enrollments?course_id=eq.${courseId}&learner_id=eq.${LEA}`, trainer)).toHaveLength(1);
    expect(await seesCourse(lea)).toBe(false);
  });

  it("supprimer un groupe retire l'accès qu'il donnait", async () => {
    const [tmp] = await insert("groups", trainer, { organization_id: ORG, name: "Groupe éphémère " + Date.now() });
    created.push(tmp!.id);
    await insert("group_members", trainer, { group_id: tmp!.id, learner_id: LEA, organization_id: ORG });
    await insert("group_enrollments", trainer, { group_id: tmp!.id, course_id: courseId, organization_id: ORG });
    expect(await seesCourse(lea)).toBe(true);
    expect(await remove(`groups?id=eq.${tmp!.id}`, trainer)).toHaveLength(1);
    expect(await seesCourse(lea)).toBe(false);
  });

  it("l'apprenant ne voit ni les groupes ni leurs membres et ne peut rien y écrire", async () => {
    expect(await select("groups?select=id", lea)).toEqual([]);
    expect(await select("group_members?select=learner_id", lea)).toEqual([]);
    expect(await select("group_enrollments?select=course_id", lea)).toEqual([]);
    expect((await insertRaw("groups", lea, { organization_id: ORG, name: "pirate" })).ok).toBe(false);
    expect((await insertRaw("group_members", lea, { group_id: groupId, learner_id: LEA, organization_id: ORG })).ok).toBe(false);
    expect((await insertRaw("group_enrollments", lea, { group_id: groupId, course_id: courseId, organization_id: ORG })).ok).toBe(false);
  });

  it("isolation : un autre organisme ne voit pas les groupes d'Horizon et ne peut pas s'y mêler", async () => {
    expect(await select(`groups?select=id&id=eq.${groupId}`, otherAdmin)).toEqual([]);
    expect(await select("group_members?select=learner_id", otherAdmin)).toEqual([]);
    // Ajouter un apprenant d'Horizon à un groupe d'Horizon, ou à son propre groupe, est refusé.
    expect((await insertRaw("group_members", otherAdmin, { group_id: groupId, learner_id: LEA, organization_id: ORG })).ok).toBe(false);
    expect((await insertRaw("group_members", otherAdmin, { group_id: otherGroupId, learner_id: LEA, organization_id: LUMIERE })).ok).toBe(false);
    // Inscrire son groupe à un parcours d'Horizon est refusé.
    expect((await insertRaw("group_enrollments", otherAdmin, { group_id: otherGroupId, course_id: courseId, organization_id: LUMIERE })).ok).toBe(false);
    expect(await remove(`groups?id=eq.${groupId}`, otherAdmin)).toEqual([]);
  });

  it("seul un apprenant peut être membre ; deux groupes ne peuvent pas porter le même nom", async () => {
    const [staff] = await select("profiles?select=id&role=eq.trainer", admin);
    expect((await insertRaw("group_members", admin, { group_id: groupId, learner_id: staff!.id, organization_id: ORG })).ok).toBe(false);

    const [{ name }] = (await select(`groups?select=id,name&id=eq.${groupId}`, trainer)) as [Row & { name: string }];
    expect((await insertRaw("groups", trainer, { organization_id: ORG, name: name.toUpperCase() })).ok).toBe(false);
  });
});
