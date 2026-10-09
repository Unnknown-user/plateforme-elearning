// Test réel du stockage des logos : seul l'administrateur de l'organisme peut écrire dans SON dossier.
// Lancer avec : npm run test:isolation   (nécessite 0002_logos_storage.sql appliqué)
import { afterAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_PASSWORD = "Demo-Elearning-2026!";
const ORG_HORIZON = "a0000000-0000-4000-8000-000000000001";

// Image PNG de 1 pixel
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Connexion impossible pour ${email}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

function upload(token: string, path: string) {
  return fetch(`${url}/storage/v1/object/logos/${path}`, {
    method: "POST",
    headers: { apikey: anonKey!, Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
    body: PNG,
  });
}

const created: string[] = [];

describe.skipIf(!url || !anonKey)("stockage des logos (base réelle)", () => {
  afterAll(async () => {
    const token = await signIn("admin@horizon.test");
    for (const path of created) {
      await fetch(`${url}/storage/v1/object/logos/${path}`, {
        method: "DELETE",
        headers: { apikey: anonKey!, Authorization: `Bearer ${token}` },
      });
    }
  });

  it("l'administrateur peut envoyer un logo dans le dossier de son organisme", async () => {
    const token = await signIn("admin@horizon.test");
    const path = `${ORG_HORIZON}/test-${crypto.randomUUID()}.png`;
    const res = await upload(token, path);
    if (res.ok) created.push(path);
    expect(res.ok).toBe(true);
  });

  it("un formateur du même organisme ne peut pas envoyer de logo", async () => {
    const token = await signIn("formateur@horizon.test");
    const res = await upload(token, `${ORG_HORIZON}/test-${crypto.randomUUID()}.png`);
    expect(res.ok).toBe(false);
  });

  it("l'administrateur d'un autre organisme ne peut pas écrire dans le dossier d'Horizon", async () => {
    const token = await signIn("admin@lumiere.test");
    const res = await upload(token, `${ORG_HORIZON}/test-${crypto.randomUUID()}.png`);
    expect(res.ok).toBe(false);
  });

  it("un visiteur non connecté ne peut rien envoyer", async () => {
    const res = await upload(anonKey!, `${ORG_HORIZON}/test-${crypto.randomUUID()}.png`);
    expect(res.ok).toBe(false);
  });
});
