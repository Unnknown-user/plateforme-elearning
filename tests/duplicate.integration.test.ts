// Tests réels de la duplication d'un parcours (fonction SQL duplicate_course).
// Crée un parcours temporaire (module, contenus, quiz) et supprime tout à la fin.
// Lancer avec : npm run test:isolation   (nécessite 0007_duplicate_course.sql appliqué)
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

const duplicate = (token: string, courseId: string) =>
  fetch(`${url}/rest/v1/rpc/duplicate_course`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ p_course_id: courseId }),
  });

type Copy = { course_id: string; files: { from: string; to: string }[] };

describe.skipIf(!url || !anonKey)("duplication d'un parcours (base réelle)", () => {
  let trainer: string, admin: string, learner: string;
  let sourceId = "";
  const created: string[] = [];
  const pdfPath = `${ORG}/test-duplication/source.pdf`;

  beforeAll(async () => {
    [trainer, admin, learner] = await Promise.all([
      signIn("formateur@horizon.test"),
      signIn("admin@horizon.test"),
      signIn("apprenant@horizon.test"),
    ]);
    const [course] = await insert("courses", trainer, {
      organization_id: ORG, title: "Parcours à dupliquer", description: "Description", objectives: "Objectifs", duration_minutes: 90, status: "published",
    });
    sourceId = course!.id;
    const [module] = await insert("modules", trainer, { organization_id: ORG, course_id: sourceId, title: "Module 1", position: 1 });
    await insert("contents", trainer, [
      { organization_id: ORG, module_id: module!.id, type: "text", title: "Texte", body: "Contenu", file_path: null, position: 1 },
      { organization_id: ORG, module_id: module!.id, type: "pdf", title: "Support", body: null, file_path: pdfPath, position: 2 },
    ]);
    const [quiz] = await insert("quizzes", trainer, {
      organization_id: ORG, module_id: module!.id, title: "Quiz", pass_threshold: 60, max_attempts: 2, show_correction: false,
    });
    const [question] = await insert("questions", trainer, {
      organization_id: ORG, quiz_id: quiz!.id, type: "single", prompt: "Question ?", explanation: "Parce que", position: 1,
    });
    const choices = await insert("choices", trainer, [
      { organization_id: ORG, question_id: question!.id, label: "Oui", position: 1 },
      { organization_id: ORG, question_id: question!.id, label: "Non", position: 2 },
    ]);
    await insert("choice_keys", trainer, [
      { choice_id: choices[0]!.id, organization_id: ORG, is_correct: true },
      { choice_id: choices[1]!.id, organization_id: ORG, is_correct: false },
    ]);
  });

  afterAll(async () => {
    for (const id of [sourceId, ...created]) {
      if (id) await fetch(`${url}/rest/v1/courses?id=eq.${id}`, { method: "DELETE", headers: headers(admin) });
    }
  });

  it("copie en brouillon le parcours, ses contenus, son quiz et ses bonnes réponses", async () => {
    const res = await duplicate(trainer, sourceId);
    expect(res.ok).toBe(true);
    const copy = (await res.json()) as Copy;
    created.push(copy.course_id);
    expect(copy.course_id).not.toBe(sourceId);

    const [course] = await select(`courses?select=title,status,description,objectives,duration_minutes&id=eq.${copy.course_id}`, trainer);
    expect(course).toMatchObject({
      title: "Parcours à dupliquer (copie)", status: "draft", description: "Description", objectives: "Objectifs", duration_minutes: 90,
    });

    const modules = await select(`modules?select=id,title&course_id=eq.${copy.course_id}`, trainer);
    expect(modules.map((m) => m.title)).toEqual(["Module 1"]);
    const contents = await select(`contents?select=type,title,file_path&module_id=eq.${modules[0]!.id}&order=position`, trainer);
    expect(contents.map((c) => c.type)).toEqual(["text", "pdf"]);

    const quizzes = await select(`quizzes?select=id,pass_threshold,max_attempts,show_correction&module_id=eq.${modules[0]!.id}`, trainer);
    expect(quizzes[0]).toMatchObject({ pass_threshold: 60, max_attempts: 2, show_correction: false });
    const choices = await select(
      `choices?select=label,choice_keys(is_correct),questions!inner(quiz_id)&questions.quiz_id=eq.${quizzes[0]!.id}&order=position`,
      trainer,
    );
    // Selon la relation, la base renvoie un objet ou une liste d'un élément.
    const correct = (c: Row) => [c.choice_keys].flat().map((k) => (k as { is_correct: boolean }).is_correct)[0];
    expect(choices.map((c) => [c.label, correct(c)])).toEqual([["Oui", true], ["Non", false]]);
  });

  it("chaque copie a son propre fichier PDF (supprimer l'un ne touche pas l'autre)", async () => {
    const copy = (await (await duplicate(trainer, sourceId)).json()) as Copy;
    created.push(copy.course_id);
    expect(copy.files).toHaveLength(1);
    expect(copy.files[0]!.from).toBe(pdfPath);
    expect(copy.files[0]!.to).not.toBe(pdfPath);
    expect(copy.files[0]!.to.startsWith(`${ORG}/${copy.course_id}/`)).toBe(true);
  });

  it("la copie reste invisible des apprenants (brouillon) et l'original est inchangé", async () => {
    const copy = (await (await duplicate(trainer, sourceId)).json()) as Copy;
    created.push(copy.course_id);
    expect(await select(`courses?select=id&id=eq.${copy.course_id}`, learner)).toEqual([]);
    expect((await select(`courses?select=status,title&id=eq.${sourceId}`, trainer))[0]).toMatchObject({ status: "published", title: "Parcours à dupliquer" });
  });

  it("l'apprenant et un autre organisme ne peuvent pas dupliquer", async () => {
    const asLearner = await duplicate(learner, sourceId);
    expect(asLearner.ok).toBe(false);
    expect(JSON.stringify(await asLearner.json())).toContain("not_allowed");

    const otherAdmin = await signIn("admin@lumiere.test");
    const asOther = await duplicate(otherAdmin, sourceId);
    expect(asOther.ok).toBe(false);
    expect(JSON.stringify(await asOther.json())).toContain("course_not_found");
  });
});
