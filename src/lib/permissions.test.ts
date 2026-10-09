import { describe, expect, it } from "vitest";
import { ACTIONS, ROLES, can, canAccessOrganization, getMenu, isRole } from "./permissions";

describe("droits par rôle", () => {
  it("seul l'administrateur gère l'organisme", () => {
    expect(can("admin", "organization:manage")).toBe(true);
    expect(can("trainer", "organization:manage")).toBe(false);
    expect(can("learner", "organization:manage")).toBe(false);
  });

  it("le formateur gère les parcours et voit le suivi, mais ne gère pas l'organisme", () => {
    expect(can("trainer", "course:manage")).toBe(true);
    expect(can("trainer", "learners:view")).toBe(true);
    expect(can("trainer", "reports:export")).toBe(true);
  });

  it("l'apprenant peut seulement suivre des parcours", () => {
    const allowed = ACTIONS.filter((a) => can("learner", a));
    expect(allowed).toEqual(["course:take"]);
  });

  it("reconnaît uniquement les rôles valides", () => {
    for (const r of ROLES) expect(isRole(r)).toBe(true);
    expect(isRole("superadmin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("isolation entre organismes", () => {
  it("autorise l'accès à son propre organisme uniquement", () => {
    expect(canAccessOrganization("org-a", "org-a")).toBe(true);
    expect(canAccessOrganization("org-a", "org-b")).toBe(false);
  });
});

describe("menu par rôle", () => {
  const labels = (r: Parameters<typeof getMenu>[0]) => getMenu(r).map((i) => i.label);

  it("le formateur voit « Mes parcours » mais pas « Paramètres de l'organisme »", () => {
    expect(labels("trainer")).toContain("Mes parcours");
    expect(labels("trainer")).not.toContain("Paramètres de l'organisme");
  });

  it("l'administrateur voit les paramètres de l'organisme", () => {
    expect(labels("admin")).toContain("Paramètres de l'organisme");
  });

  it("l'apprenant voit uniquement « Mes formations »", () => {
    expect(labels("learner")).toEqual(["Mes formations"]);
  });
});

describe("pages d'accueil et libellés", () => {
  it("chaque rôle arrive sur sa page, l'apprenant n'arrive jamais sur l'espace formateur", async () => {
    const { homePathFor, ROLE_LABELS } = await import("./permissions");
    expect(homePathFor("learner")).toBe("/learner");
    expect(homePathFor("trainer")).toBe("/courses");
    expect(homePathFor("admin")).toBe("/courses");
    expect(ROLE_LABELS.trainer).toBe("Formateur");
  });
});
