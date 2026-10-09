// Test réel des règles d'accès aux parcours : isolation entre organismes, brouillons invisibles
// pour les apprenants, écriture réservée aux formateurs/administrateurs.
// Lancer avec : npm run test:isolation   (nécessite 0003_courses.sql et seed_courses.sql appliqués)
import { afterAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_PASSWORD = "Demo-Elearning-2026!";

const ORG_HORIZON = "a0000000-0000-4000-8000-000000000001";
const ORG_LUMIERE = "b0000000-0000-4000-8000-000000000002";
const DRAFT_HORIZON = "c1000000-0000-4000-8000-000000000003";

type Row = Record<string, unknown>;

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Connexion impossible pour ${email}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

const headers = (token: string) => ({
  apikey: anonKey!,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

async function select(path: string, token: string): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Lecture refusée (${res.status})`);
  return (await res.json()) as Row[];
}

const createdCourses: string[] = [];

describe.skipIf(!url || !anonKey)("parcours : droits d'accès (base réelle)", () => {
  afterAll(async () => {
    const token = await signIn("admin@horizon.test");
    for (const id of createdCourses) {
      await fetch(`${url}/rest/v1/courses?id=eq.${id}`, { method: "DELETE", headers: headers(token) });
    }
  });

  it("le formateur voit tous les parcours de son organisme (brouillons inclus), et seulement les siens", async () => {
    const courses = await select("courses?select=id,status,organization_id", await signIn("formateur@horizon.test"));
    expect(courses.length).toBeGreaterThanOrEqual(4);
    expect(courses.every((c) => c.organization_id === ORG_HORIZON)).toBe(true);
    expect(courses.some((c) => c.status === "draft")).toBe(true);
  });

  it("l'apprenant ne voit que les parcours publiés de son organisme", async () => {
    const courses = await select("courses?select=id,status,organization_id", await signIn("apprenant@horizon.test"));
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((c) => c.status === "published" && c.organization_id === ORG_HORIZON)).toBe(true);
  });

  it("l'apprenant ne voit ni les modules ni les contenus d'un brouillon", async () => {
    const token = await signIn("apprenant@horizon.test");
    expect(await select(`modules?course_id=eq.${DRAFT_HORIZON}&select=id`, token)).toEqual([]);
    const contents = await select("contents?select=id,module_id", token);
    const draftModules = await select(`modules?course_id=eq.${DRAFT_HORIZON}&select=id`, await signIn("admin@horizon.test"));
    const draftIds = new Set(draftModules.map((m) => m.id));
    expect(contents.some((c) => draftIds.has(c.module_id))).toBe(false);
  });

  it("un organisme ne voit jamais les parcours d'un autre", async () => {
    const courses = await select("courses?select=id,organization_id", await signIn("admin@lumiere.test"));
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((c) => c.organization_id === ORG_LUMIERE)).toBe(true);
    const crossRead = await select(`courses?id=eq.${DRAFT_HORIZON}&select=id`, await signIn("admin@lumiere.test"));
    expect(crossRead).toEqual([]);
  });

  it("l'apprenant ne peut pas créer de parcours", async () => {
    const res = await fetch(`${url}/rest/v1/courses`, {
      method: "POST",
      headers: headers(await signIn("apprenant@horizon.test")),
      body: JSON.stringify({ organization_id: ORG_HORIZON, title: "Parcours pirate" }),
    });
    expect(res.ok).toBe(false);
  });

  it("le formateur ne peut pas créer un parcours dans un autre organisme", async () => {
    const res = await fetch(`${url}/rest/v1/courses`, {
      method: "POST",
      headers: headers(await signIn("formateur@horizon.test")),
      body: JSON.stringify({ organization_id: ORG_LUMIERE, title: "Parcours intrus" }),
    });
    expect(res.ok).toBe(false);
  });

  it("le formateur peut créer un parcours dans son organisme", async () => {
    const res = await fetch(`${url}/rest/v1/courses`, {
      method: "POST",
      headers: { ...headers(await signIn("formateur@horizon.test")), Prefer: "return=representation" },
      body: JSON.stringify({ organization_id: ORG_HORIZON, title: "Parcours de test automatique" }),
    });
    expect(res.ok).toBe(true);
    const [created] = (await res.json()) as Row[];
    createdCourses.push(String(created.id));
  });

  it("un module ne peut pas être rattaché à un parcours d'un autre organisme", async () => {
    const res = await fetch(`${url}/rest/v1/modules`, {
      method: "POST",
      headers: headers(await signIn("admin@lumiere.test")),
      body: JSON.stringify({ organization_id: ORG_LUMIERE, course_id: DRAFT_HORIZON, title: "Module intrus" }),
    });
    expect(res.ok).toBe(false);
  });
});
