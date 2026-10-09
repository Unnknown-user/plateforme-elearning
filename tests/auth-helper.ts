// Connexion des comptes de démonstration pour les tests réels.
// Supabase limite le nombre de connexions rapprochées (erreur 429) : chaque compte ne se connecte qu'une fois
// et son jeton est réutilisé (en mémoire et dans un petit cache local, valable tant que le jeton l'est).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_PASSWORD = "Demo-Elearning-2026!";
const CACHE_FILE = "node_modules/.cache/test-tokens.json"; // dossier ignoré par Git

const memory = new Map<string, string>();

function expiresAt(token: string): number {
  try {
    return (JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as { exp: number }).exp * 1000;
  } catch {
    return 0;
  }
}

function readCache(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function signIn(email: string): Promise<string> {
  const inMemory = memory.get(email);
  if (inMemory && expiresAt(inMemory) > Date.now() + 60_000) return inMemory;

  const cached = readCache()[email];
  if (cached && expiresAt(cached) > Date.now() + 60_000) {
    memory.set(email, cached);
    return cached;
  }

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Connexion impossible pour ${email} (${res.status})`);
  const token = ((await res.json()) as { access_token: string }).access_token;

  memory.set(email, token);
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ ...readCache(), [email]: token }));
  } catch {
    // Le cache est facultatif.
  }
  return token;
}
