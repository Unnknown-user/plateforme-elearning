// Test d'isolation RÉEL : se connecte à la base Supabase avec chaque compte de démo
// et vérifie que personne ne voit les données d'un autre organisme.
// Lancer avec : npm run test:isolation   (nécessite .env.local et le seed appliqué)
import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_PASSWORD = "Demo-Elearning-2026!";

const ORG_HORIZON = "a0000000-0000-4000-8000-000000000001";
const ORG_LUMIERE = "b0000000-0000-4000-8000-000000000002";

type Row = Record<string, unknown>;

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Connexion impossible pour ${email} (${res.status})`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function select(table: string, token: string | null): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey: anonKey!, Authorization: `Bearer ${token ?? anonKey}` },
  });
  if (!res.ok) throw new Error(`Lecture ${table} refusée (${res.status})`);
  return (await res.json()) as Row[];
}

describe.skipIf(!url || !anonKey)("isolation entre organismes (base réelle)", () => {
  it("un visiteur non connecté ne voit rien", async () => {
    expect(await select("organizations", null)).toEqual([]);
    expect(await select("profiles", null)).toEqual([]);
  });

  it("l'administrateur d'Horizon voit son organisme et ses 3 membres, pas ceux de Lumière", async () => {
    const token = await signIn("admin@horizon.test");
    const orgs = await select("organizations", token);
    const profiles = await select("profiles", token);
    expect(orgs.map((o) => o.id)).toEqual([ORG_HORIZON]);
    expect(profiles).toHaveLength(3);
    expect(profiles.every((p) => p.organization_id === ORG_HORIZON)).toBe(true);
  });

  it("le formateur de Lumière ne voit que l'organisme Lumière", async () => {
    const token = await signIn("formateur@lumiere.test");
    const orgs = await select("organizations", token);
    const profiles = await select("profiles", token);
    expect(orgs.map((o) => o.id)).toEqual([ORG_LUMIERE]);
    expect(profiles.every((p) => p.organization_id === ORG_LUMIERE)).toBe(true);
  });

  it("l'apprenant ne voit que son propre profil", async () => {
    const token = await signIn("apprenant@horizon.test");
    const profiles = await select("profiles", token);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].full_name).toBe("Léa Fontaine");
  });

  it("un formateur ne peut pas modifier l'organisme ; un administrateur d'un autre organisme non plus", async () => {
    for (const email of ["formateur@horizon.test", "admin@lumiere.test"]) {
      const token = await signIn(email);
      const res = await fetch(`${url}/rest/v1/organizations?id=eq.${ORG_HORIZON}`, {
        method: "PATCH",
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ name: "Nom piraté" }),
      });
      // La règle ne laisse passer aucune ligne : succès avec liste vide, ou refus explicite.
      const body = res.ok ? ((await res.json()) as Row[]) : [];
      expect(body).toEqual([]);
    }
  });
});
