// Tests réels du calcul des scores et des droits sur les quiz.
// Le test crée son propre parcours/quiz temporaire (supprimé à la fin) : les tentatives des
// comptes de démonstration ne sont pas consommées.
// Lancer avec : npm run test:isolation   (nécessite 0004_quizzes.sql appliqué)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signIn } from "./auth-helper";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ORG = "a0000000-0000-4000-8000-000000000001";

type Row = Record<string, unknown> & { id: string };
type Submit = { ok: boolean; status: number; body: Record<string, unknown> };

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

async function patch(table: string, token: string, filter: string, changes: object): Promise<void> {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error(`Modification ${table} refusée : ${await res.text()}`);
}

async function select(path: string, token: string): Promise<Row[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Lecture refusée (${res.status})`);
  return (await res.json()) as Row[];
}

async function submit(token: string, quizId: string, answers: unknown): Promise<Submit> {
  const res = await fetch(`${url}/rest/v1/rpc/submit_quiz_attempt`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ p_quiz_id: quizId, p_answers: answers }),
  });
  return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe.skipIf(!url || !anonKey)("quiz : score, seuil, tentatives, droits (base réelle)", () => {
  let trainer: string, admin: string, learner: string;
  let courseId = "", quizId = "";
  // identifiants des choix, par question
  const q: Record<"single" | "multiple" | "tf", { id: string; ids: Record<string, string> }> = {
    single: { id: "", ids: {} },
    multiple: { id: "", ids: {} },
    tf: { id: "", ids: {} },
  };

  /** Réponses où chaque question est juste. */
  const perfect = () => ({
    [q.single.id]: [q.single.ids.B!],
    [q.multiple.id]: [q.multiple.ids.A!, q.multiple.ids.C!],
    [q.tf.id]: [q.tf.ids.Vrai!],
  });

  beforeAll(async () => {
    [trainer, admin, learner] = await Promise.all([
      signIn("formateur@horizon.test"),
      signIn("admin@horizon.test"),
      signIn("apprenant@horizon.test"),
    ]);
    const [course] = await insert("courses", trainer, { organization_id: ORG, title: "Parcours de test quiz", status: "published" });
    courseId = course!.id;
    const [module] = await insert("modules", trainer, { organization_id: ORG, course_id: courseId, title: "Module test", position: 1 });
    const [quiz] = await insert("quizzes", trainer, {
      organization_id: ORG, module_id: module!.id, title: "Quiz test", pass_threshold: 70, max_attempts: null, show_correction: true,
    });
    quizId = quiz!.id;

    const questions = await insert("questions", trainer, [
      { organization_id: ORG, quiz_id: quizId, type: "single", prompt: "Q1", explanation: "Explication 1", position: 1 },
      { organization_id: ORG, quiz_id: quizId, type: "multiple", prompt: "Q2", explanation: "Explication 2", position: 2 },
      { organization_id: ORG, quiz_id: quizId, type: "true_false", prompt: "Q3", explanation: "Explication 3", position: 3 },
    ]);
    const specs: [keyof typeof q, Row, [string, boolean][]][] = [
      ["single", questions[0]!, [["A", false], ["B", true], ["C", false]]],
      ["multiple", questions[1]!, [["A", true], ["B", false], ["C", true], ["D", false]]],
      ["tf", questions[2]!, [["Vrai", true], ["Faux", false]]],
    ];
    for (const [key, question, options] of specs) {
      q[key].id = question.id;
      const choices = await insert("choices", trainer, options.map(([label], i) => ({
        organization_id: ORG, question_id: question.id, label, position: i + 1,
      })));
      choices.forEach((c) => (q[key].ids[String(c.label)] = c.id));
      await insert("choice_keys", trainer, choices.map((c, i) => ({
        choice_id: c.id, organization_id: ORG, is_correct: options[i]![1],
      })));
    }
  });

  afterAll(async () => {
    if (courseId) {
      await fetch(`${url}/rest/v1/courses?id=eq.${courseId}`, { method: "DELETE", headers: headers(admin) });
    }
  });

  it("l'apprenant ne peut pas lire les bonnes réponses, le formateur oui", async () => {
    expect(await select("choice_keys?select=*", learner)).toEqual([]);
    const staffKeys = await select(`choice_keys?select=*&choice_id=eq.${q.single.ids.B}`, trainer);
    expect(staffKeys[0]?.is_correct).toBe(true);
    // L'apprenant voit pourtant les questions et les choix (sans indication de la bonne réponse).
    const choices = await select(`choices?select=*&question_id=eq.${q.single.id}`, learner);
    expect(choices).toHaveLength(3);
    expect(choices.every((c) => !("is_correct" in c))).toBe(true);
  });

  it("toutes les réponses justes : 100 %, réussi", async () => {
    const r = await submit(learner, quizId, perfect());
    expect(r.ok).toBe(true);
    expect(r.body).toMatchObject({ score_percent: 100, points: 3, max_points: 3, passed: true });
  });

  it("toutes les réponses fausses ou aucune réponse : 0 %, échec", async () => {
    const wrong = {
      [q.single.id]: [q.single.ids.A!],
      [q.multiple.id]: [q.multiple.ids.B!, q.multiple.ids.D!],
      [q.tf.id]: [q.tf.ids.Faux!],
    };
    expect((await submit(learner, quizId, wrong)).body).toMatchObject({ score_percent: 0, passed: false });
    expect((await submit(learner, quizId, {})).body).toMatchObject({ score_percent: 0, passed: false });
  });

  it("2 questions sur 3 = 67 % : échec à 70 %, réussite à 67 % (seuil inclus)", async () => {
    const twoOfThree = { ...perfect(), [q.tf.id]: [q.tf.ids.Faux!] };
    expect((await submit(learner, quizId, twoOfThree)).body).toMatchObject({ score_percent: 67, points: 2, passed: false });
    await patch("quizzes", trainer, `id=eq.${quizId}`, { pass_threshold: 67 });
    expect((await submit(learner, quizId, twoOfThree)).body).toMatchObject({ score_percent: 67, passed: true });
    await patch("quizzes", trainer, `id=eq.${quizId}`, { pass_threshold: 70 });
  });

  it("choix multiple : tout ou rien (une bonne réponse oubliée ou une fausse en trop = question fausse)", async () => {
    const missing = { ...perfect(), [q.multiple.id]: [q.multiple.ids.A!] };
    const extra = { ...perfect(), [q.multiple.id]: [q.multiple.ids.A!, q.multiple.ids.C!, q.multiple.ids.D!] };
    expect((await submit(learner, quizId, missing)).body).toMatchObject({ points: 2 });
    expect((await submit(learner, quizId, extra)).body).toMatchObject({ points: 2 });
  });

  it("un choix qui appartient à une autre question est ignoré (pas de triche, pas d'erreur)", async () => {
    const tricky = { ...perfect(), [q.multiple.id]: [q.single.ids.B!] };
    expect((await submit(learner, quizId, tricky)).body).toMatchObject({ points: 2 });
  });

  it("la correction n'est renvoyée que si le quiz l'autorise", async () => {
    const withReview = (await submit(learner, quizId, perfect())).body as { review: Row[] };
    expect(withReview.review).toHaveLength(3);
    expect(withReview.review[0]).toMatchObject({ explanation: "Explication 1", correct: true });
    expect(withReview.review[0]!.correct_choice_ids).toEqual([q.single.ids.B]);

    await patch("quizzes", trainer, `id=eq.${quizId}`, { show_correction: false });
    expect((await submit(learner, quizId, perfect())).body).toMatchObject({ review: null });
    await patch("quizzes", trainer, `id=eq.${quizId}`, { show_correction: true });
  });

  it("le nombre de tentatives est limité", async () => {
    const used = (await select(`quiz_attempts?select=id&quiz_id=eq.${quizId}`, learner)).length;
    expect(used).toBeGreaterThan(0);

    await patch("quizzes", trainer, `id=eq.${quizId}`, { max_attempts: used });
    const blocked = await submit(learner, quizId, perfect());
    expect(blocked.ok).toBe(false);
    expect(String(blocked.body.message)).toContain("attempts_exhausted");

    await patch("quizzes", trainer, `id=eq.${quizId}`, { max_attempts: used + 1 });
    expect((await submit(learner, quizId, perfect())).ok).toBe(true);
    const again = await submit(learner, quizId, perfect());
    expect(again.ok).toBe(false);
    expect(String(again.body.message)).toContain("attempts_exhausted");
  });

  it("formateur, autre organisme, brouillon, visiteur : tous refusés", async () => {
    await patch("quizzes", trainer, `id=eq.${quizId}`, { max_attempts: null });

    expect(String((await submit(trainer, quizId, perfect())).body.message)).toContain("not_allowed");
    const otherOrg = await signIn("apprenant@lumiere.test");
    expect(String((await submit(otherOrg, quizId, perfect())).body.message)).toContain("quiz_not_found");
    expect((await submit(anonKey!, quizId, perfect())).ok).toBe(false);

    await patch("courses", trainer, `id=eq.${courseId}`, { status: "draft" });
    expect(String((await submit(learner, quizId, perfect())).body.message)).toContain("quiz_not_found");
    expect(await select(`quizzes?id=eq.${quizId}&select=id`, learner)).toEqual([]);
    await patch("courses", trainer, `id=eq.${courseId}`, { status: "published" });
  });

  it("l'apprenant ne peut pas écrire ni modifier une tentative directement", async () => {
    const forged = await fetch(`${url}/rest/v1/quiz_attempts`, {
      method: "POST",
      headers: headers(learner),
      body: JSON.stringify({
        organization_id: ORG, quiz_id: quizId, learner_id: "a1000000-0000-4000-8000-000000000003",
        score_percent: 100, points: 3, max_points: 3, passed: true, answers: {},
      }),
    });
    expect(forged.ok).toBe(false);

    const mine = await select(`quiz_attempts?select=id,score_percent&quiz_id=eq.${quizId}&limit=1`, learner);
    const tamper = await fetch(`${url}/rest/v1/quiz_attempts?id=eq.${mine[0]!.id}`, {
      method: "PATCH", headers: headers(learner), body: JSON.stringify({ score_percent: 100, passed: true }),
    });
    expect(tamper.ok ? ((await tamper.json()) as Row[]) : []).toEqual([]);
  });
});
