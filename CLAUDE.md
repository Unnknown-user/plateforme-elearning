# CLAUDE.md — Plateforme e-learning en marque blanche

> Source de vérité du projet. À relire avant chaque action et à mettre à jour à chaque étape.
> Porteuse du projet : Mélissa (non développeuse, expertise formation / Qualiopi / OPCO). Interface et communication en **français** ; code en **anglais**.

## Objectif
Prototype démontrable à 10-15 prospects (petits organismes de formation, PME sans LMS) pour valider la demande avant tout investissement. Ce n'est **pas** un prototype jetable : chaque choix doit permettre d'évoluer vers un produit vendable sans réécriture. Démo visée : environ 1 mois après le 2026-10-09.

## Périmètre strict : 5 fonctionnalités
1. **Comptes et rôles** : administrateur de l'organisme, formateur, apprenant. Authentification via service éprouvé (Supabase Auth), jamais codée maison.
2. **Création de parcours** : modules composés de contenus simples (texte, vidéo via lien, PDF).
3. **Quiz** : choix unique, choix multiple, vrai/faux ; score, seuil de réussite paramétrable, nombre de tentatives paramétrable, correction affichable ou non.
4. **Suivi de progression et traces Qualiopi** : temps passé, résultats aux quiz, statut d'avancement ; export CSV et attestation de fin de parcours en PDF.
5. **Marque blanche** : nom, logo, couleurs de l'organisme appliqués à l'interface.

Ajout validé : une **page d'accueil publique légère** (option A, dernière étape avant la démo). Pas de vitrine multi-pages.

## Stack retenue (et pourquoi)
- **Next.js (App Router) + TypeScript + Tailwind** : très répandu, un freelance moyen peut le reprendre.
- **Supabase** (région UE) : authentification, base PostgreSQL, stockage de fichiers. Isolation entre organismes assurée dans la base (Row Level Security).
- **Vercel** (région Paris) pour l'hébergement. **Vitest** (+ Testing Library) pour les tests ; Playwright envisagé pour les tests de bout en bout.
- Alternative écartée : Next.js + Clerk + Neon (isolation uniquement dans le code, plus cher, 3 services, données non hébergées en UE par défaut).

## Règles non négociables
- Données **fictives uniquement**. Jamais de clé ni de secret dans le code : `.env.local` (exclu de Git) + `.env.example` documenté.
- **Isolation stricte** : chaque donnée métier porte `organization_id` ; règles RLS + tests automatisés.
- Une étape = vérification (démarrage + tests) → commit Git en français → explication à Mélissa → pause jusqu'à son feu vert.
- Toute information métier (Qualiopi, attestation, vocabulaire) : on demande à Mélissa.
- Pilote avec de vrais apprenants (autres que Mélissa) : alerter, RGPD à traiter avant. Principe « privacy by design » appliqué dès maintenant.
- Hors périmètre : ajouter à « Plus tard », signaler à Mélissa, proposer un échange avec l'une des 5 fonctionnalités.

## Conventions
- Code, noms de fichiers, variables, tables : anglais. Textes visibles, messages de commit, documentation : français.
- Fichiers en `kebab-case`, composants React en `PascalCase`, tables SQL en `snake_case` pluriel.
- Code commenté de façon utile (le « pourquoi »), lisible par un développeur qui reprend le projet.
- Tests à côté du code (`*.test.ts(x)`), obligatoires sur : droits d'accès, calcul des scores, traces de progression.
- Commandes : `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`.
- Note : le Git installé (2.23) est ancien ; pas d'option `git init -b`.

## État d'avancement
- [x] **Étape 1** — Initialisation (projet, Git, tests, CLAUDE.md, README.md) — 2026-10-09
- [x] **Étape 2** — Comptes et rôles + isolation + tests : droits par rôle (`permissions.ts`), schéma + RLS (`supabase/migrations`), comptes de démo (`supabase/seed.sql`), test d'isolation sur base réelle (`npm run test:isolation`), page de connexion, protection des pages (`src/proxy.ts`), menu par rôle — 2026-10-09
- [ ] Étape 3 — Personnalisation marque blanche
- [ ] Étape 4 — Création de parcours
- [ ] Étape 5 — Quiz
- [ ] Étape 6 — Suivi, traces Qualiopi, export CSV, attestation PDF
- [ ] Étape 7 — Données de démo, page d'accueil publique légère, scénario de démo prospect

## Journal des décisions
| Date | Décision | Raison |
|---|---|---|
| 2026-10-09 | Stack Next.js + Supabase + Vercel | Un seul service pour auth/BDD/fichiers, hébergement UE, isolation via RLS |
| 2026-10-09 | Un seul site ; l'organisme est déterminé à la connexion | Simplicité du prototype ; sous-domaines par organisme plus tard |
| 2026-10-09 | Budget 0 € : offres gratuites, pas de nom de domaine pour l'instant | Choix de Mélissa |
| 2026-10-09 | Page d'accueil publique légère (option A) en étape 7 | Montrer l'expertise de Mélissa sans mettre le délai en danger |
| 2026-10-09 | Projet dans `plateforme-elearning/` avec son propre dépôt Git | Le dossier personnel est lui-même un dépôt Git ; éviter tout mélange |
| 2026-10-09 | Test d'isolation contre la vraie base Supabase (hors `npm test`) | Seul moyen de prouver que les règles RLS fonctionnent ; données fictives |
| 2026-10-09 | Noms accentués du seed écrits en séquences U&'\00e9' | Un copier-coller via le presse-papiers avait corrompu les accents |
| 2026-10-09 | Options `cacheComponents` / `partialPrefetching` de Next.js retirées | Activées par défaut dans le modèle de projet, elles imposent des contraintes inutiles : tout l'espace connecté est propre à chaque personne (rendu à la demande) |
| 2026-10-09 | Next.js 16 : `src/proxy.ts` remplace `middleware.ts` | Convention officielle de cette version |
| 2026-10-09 | `@types/node` en v24 | Aligné sur Node 24 ; évite un conflit de dépendances avec Vitest |

## Plus tard (hors périmètre)
- Vitrine multi-pages (offre, tarifs, à propos, blog)
- Paiement / abonnements, IA générative intégrée, classes virtuelles
- SCORM / xAPI, notifications e-mail avancées, application mobile
- Sous-domaine par organisme, nom de domaine personnalisé

## Feuille de route vers la commercialisation
Classée par priorité. Marqueur : ⚠️ À REVOIR AVANT MISE EN VENTE.
1. ⚠️ **RGPD** : registre de traitements, information et consentement, droit à l'effacement, contrats de sous-traitance (Supabase, Vercel), politique de confidentialité. Obligatoire avant tout pilote avec de vrais apprenants autres que Mélissa.
2. ⚠️ **Sécurité** : audit de l'isolation entre organismes, politique de mots de passe, double authentification, sauvegardes, journal d'accès.
3. ⚠️ **Comptes de démo** : mot de passe unique et simple, à supprimer avant toute mise en production ; tables auth alimentées par SQL direct (démo uniquement).
3. ⚠️ **Dépendances de développement** : `npm audit` signale 5 vulnérabilités « high » dans l'outil de lint (`eslint-config-next` → `braces`). Sans effet en production ; à traiter à la prochaine montée de version.
4. ⚠️ **Hébergement de production** : environnements séparés, supervision, plan de reprise, domaine.
5. ⚠️ **Conformité Qualiopi** : valider attestation et indicateurs avec Mélissa, voire un auditeur.
6. ⚠️ SCORM / xAPI · ⚠️ Accessibilité RGAA · ⚠️ Performance à l'échelle · ⚠️ Facturation et e-mails · ⚠️ CGV / CGU.
