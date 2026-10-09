// Test réel du stockage des logos : seul l'administrateur de l'organisme peut écrire dans SON dossier.
// Lancer avec : npm run test:isolation   (nécessite 0002_logos_storage.sql appliqué)
import { afterAll, describe, expect, it } from "vitest";
import { signIn } from "./auth-helper";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ORG_HORIZON = "a0000000-0000-4000-8000-000000000001";

// Image PNG de 1 pixel
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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
