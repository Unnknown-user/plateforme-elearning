// Droits d'accès par rôle. Cette matrice est la référence côté application ;
// l'isolation entre organismes est appliquée en plus dans la base (voir supabase/migrations).

export const ROLES = ["admin", "trainer", "learner"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "organization:manage", // nom, logo, couleurs, utilisateurs
  "course:manage", // créer / modifier des parcours et quiz
  "course:take", // suivre un parcours et passer les quiz
  "learners:view", // voir les apprenants et leur suivi
  "reports:export", // export CSV, attestations
] as const;
export type Action = (typeof ACTIONS)[number];

const PERMISSIONS: Record<Role, readonly Action[]> = {
  admin: ["organization:manage", "course:manage", "learners:view", "reports:export"],
  trainer: ["course:manage", "learners:view", "reports:export"],
  learner: ["course:take"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].includes(action);
}

/** Règle d'or de la marque blanche : on n'accède qu'aux données de son propre organisme. */
export function canAccessOrganization(userOrganizationId: string, targetOrganizationId: string): boolean {
  return userOrganizationId === targetOrganizationId;
}

export type MenuIcon = "learner" | "courses" | "learners" | "groups" | "settings";
export type MenuItem = { label: string; href: string; icon: MenuIcon };

/** Menu affiché selon le rôle (libellés visibles en français). */
export function getMenu(role: Role): MenuItem[] {
  const items: MenuItem[] = [];
  if (role === "learner") items.push({ label: "Mes formations", href: "/learner", icon: "learner" });
  if (can(role, "course:manage")) items.push({ label: "Mes parcours", href: "/courses", icon: "courses" });
  if (can(role, "learners:view")) items.push({ label: "Apprenants et suivi", href: "/learners", icon: "learners" });
  if (can(role, "learners:view")) items.push({ label: "Groupes", href: "/groups", icon: "groups" });
  if (can(role, "organization:manage")) {
    items.push({ label: "Paramètres de l'organisme", href: "/settings", icon: "settings" });
  }
  return items;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  trainer: "Formateur",
  learner: "Apprenant",
};

/** Page d'accueil de chaque rôle après connexion. */
export function homePathFor(role: Role): string {
  return role === "learner" ? "/learner" : "/courses";
}
