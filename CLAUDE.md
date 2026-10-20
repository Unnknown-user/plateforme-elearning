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
- [x] **Étape 3** — Personnalisation marque blanche (nom, couleur, logo avec retrait, refonte de l'interface : menu latéral, cartes) — 2026-10-09
- [x] **Étape 4** — Création de parcours : parcours, modules, contenus texte / vidéo (YouTube, Vimeo) / PDF, publication, aperçu apprenant, parcours fictifs lorem (`supabase/seed_courses.sql`) — 2026-10-09
- [x] **Étape 5** — Quiz : choix unique / multiple / vrai-faux, seuil et tentatives paramétrables, correction affichable ou non, score calculé dans la base, bonnes réponses invisibles aux apprenants, 3 quiz fictifs (`supabase/seed_quizzes.sql`). Ajouts : modification du titre/durée/objectifs d'un parcours, réordonnancement des modules et contenus — 2026-10-09
- [x] **Étape 6** — Suivi et traces Qualiopi : contenus terminés, temps passé (plafonné côté base), avancement et statut par parcours, tableau de suivi, export CSV (suivi + résultats aux quiz), attestation de fin de parcours en PDF, mentions légales de l'organisme, apprenants et activité fictifs (`supabase/seed_tracking.sql`) — 2026-10-09
- [x] **Étape 7** — Page d'accueil publique légère, scénario de démo prospect (`docs/scenario-demo.md`), remise à zéro de la démo (`supabase/reset_demo.sql`), jeu de données de démonstration complet — 2026-10-09

**Le prototype des 5 fonctionnalités est complet.** Avant les démos, Mélissa a validé (2026-10-20) une phase d'extensions, **puis** le déploiement sur Vercel. Ensuite : démos auprès de 10-15 prospects, puis la feuille de route ci-dessous avec un développeur professionnel.

### Phase d'extensions (validée le 2026-10-20, une étape = vérification → commit → explication → pause)
- [x] **Étape 8a** — Fiabilisation : erreurs d'actions visibles, confirmation avant suppression, page d'erreur — 2026-10-20
- [x] **Étape 8** — Quiz : modifier et réordonner les questions après création (fonction SQL `update_question`, migration 0006, tests sur base réelle) — 2026-10-20
- [x] **Étape 9** — Dupliquer un parcours (modules, contenus, quiz, PDF ; copie en brouillon ; fonction SQL `duplicate_course`, migration 0007, tests sur base réelle) — 2026-10-20
- [x] **Étape 10** — Inscription des apprenants aux parcours, individuelle (10a : table `enrollments`, règle d'accès unique `can_access_course`, migrations 0008 + correctif 0009) et par groupe (10b : groupes d'apprenants, page « Groupes », migration 0010) ; l'apprenant ne voit que les parcours publiés auxquels il est inscrit. Recherche par nom et cases à cocher pour inscrire. Tests sur base réelle 60/60 — 2026-10-20
- [ ] **Étape 11** — Création / invitation des utilisateurs depuis l'interface (admin) ; touche à la sécurité (clé de service côté serveur uniquement)
- [ ] **Étape 12** — Tableau de bord administrateur : taux de complétion, apprenants en retard, parcours les plus suivis
- [ ] **Étape 13** — Marque blanche poussée : texte d'accueil et bandeau de connexion par organisme, attestation aux couleurs de l'organisme
- [ ] **Étape 14** — Qualiopi : évaluation à chaud en fin de parcours, registre numéroté des attestations, modèle d'attestation personnalisable (contenu à fournir par Mélissa)
- [ ] **Étape 15** — Site public : section « Qualiopi » (textes de Mélissa), capture / courte vidéo de démo, référencement de base
- [ ] **Étape 16** — Déploiement sur Vercel (région Paris) + démo hébergée
- Hors périmètre **validées mais à planifier après les premières démos** : notifications par e-mail, banque de questions et tirage aléatoire, messagerie formateur-apprenant, page « Offre et tarifs », formulaire de demande de démo (RGPD d'abord), mentions légales et politique de confidentialité.

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
| 2026-10-09 | Refonte de l'interface dans l'esprit des LMS modernes (menu latéral, cartes, accent = couleur de l'organisme via variables CSS `--brand`) ; icônes lucide-react | Demande de Mélissa ; inspiration d'ergonomie uniquement, sans reprise de marque ni d'éléments protégés |
| 2026-10-09 | Logo : PNG/JPEG/WebP, 1 Mo max, SVG refusé ; dossier = identifiant de l'organisme ; lecture publique | Un SVG peut contenir du code actif ; la base empêche d'écrire dans le dossier d'un autre organisme |
| 2026-10-09 | Parcours > modules > contenus ; l'apprenant ne voit que les parcours publiés (règle dans la base) ; clés composites (id, organization_id) pour interdire tout rattachement entre organismes | Isolation et brouillons garantis par la base, pas seulement par le code |
| 2026-10-09 | Vidéos : YouTube et Vimeo seulement, intégrées via youtube-nocookie ; PDF 10 Mo en bucket privé, liens temporaires 1 h | Limite le risque (pas de lien arbitraire intégré) et respecte la vie privée |
| 2026-10-09 | Copie du SQL dans le presse-papiers avec `LC_ALL=en_US.UTF-8 pbcopy` | Sinon les accents sont corrompus (problème rencontré à l'étape 2) |
| 2026-10-09 | Écran de gestion d'un parcours : chaque contenu est affiché comme chez l'apprenant (même composant), avec « Modifier » et « Supprimer » dessous ; modules renommables | Demande de Mélissa : voir ce que voit l'apprenant en éditant |
| 2026-10-09 | Quiz : bonnes réponses dans une table séparée (`choice_keys`) lisible par le seul personnel ; score calculé par la fonction SQL `submit_quiz_attempt` ; aucune écriture directe des tentatives | Un apprenant ne peut ni lire les réponses ni s'inventer une note |
| 2026-10-09 | Notation : 1 point par question, tout-ou-rien (choix multiple : il faut cocher exactement les bonnes réponses) ; réussite si score >= seuil | Règle simple et lisible, À VALIDER avec Mélissa |
| 2026-10-09 | Tests des quiz : parcours temporaire créé puis supprimé (cascade) | Ne consomme pas les tentatives des comptes de démo |
| 2026-10-09 | Avancement = (contenus terminés + quiz réussis) / (contenus + quiz) ; « terminé » à 100 % ; contenu terminé = déclaré par l'apprenant (bouton) | Règle simple et lisible, À VALIDER avec Mélissa |
| 2026-10-09 | Temps passé mesuré par signaux de présence (30 s) ; la base plafonne chaque signal au temps réellement écoulé | Empêche de gonfler le temps ; reste une approximation (présence à l'écran) |
| 2026-10-09 | Écriture des traces uniquement via les fonctions SQL `mark_content_done` et `track_course_time` | L'apprenant ne peut pas falsifier ses traces |
| 2026-10-09 | Exports CSV : séparateur « ; », UTF-8 avec BOM, cellules neutralisées contre l'injection de formules | Ouverture directe dans Excel français, sans faille d'injection |
| 2026-10-09 | Attestation PDF générée avec pdf-lib, mentions : organisme + n° de déclaration d'activité, apprenant, parcours, durée prévue / connexion, période, objectifs, évaluations, signataire | Base validée par Mélissa, à peaufiner |
| 2026-10-09 | Tests réels : jetons de connexion mis en cache (`tests/auth-helper.ts`) | Supabase limite les connexions rapprochées (erreur 429) |
| 2026-10-09 | Page d'accueil publique légère : textes sans chiffre ni témoignage inventé ; contact par lien mailto (adresse dans `NEXT_PUBLIC_CONTACT_EMAIL`), aucun formulaire ni donnée collectée | Éviter toute allégation non vérifiable et tout traitement de données personnelles avant le RGPD |
| 2026-10-09 | Script `supabase/reset_demo.sql` limité aux deux organismes fictifs | Rejouer la démo à l'identique (tentatives de quiz limitées, couleurs modifiées en direct) |
| 2026-10-20 | Actions serveur à bouton simple : `assertChanged` lève une erreur si la base échoue ou ignore l'écriture (RLS) ; page `error.tsx` en français ; confirmation avant toute suppression (`ConfirmButton`) | Une suppression refusée paraissait réussie ; un clic accidentel effaçait un parcours entier |
| 2026-10-20 | Extension du périmètre validée par Mélissa : étapes 8 à 15 (voir « Phase d'extensions »), déploiement Vercel repoussé après elles (étape 16) | Démo plus crédible (inscriptions, invitations, tableau de bord, Qualiopi) ; le périmètre reste les 5 fonctionnalités, étendues |
| 2026-10-20 | Accès d'un apprenant = parcours publié ET (inscription individuelle OU membre d'un groupe inscrit), écrit en un seul endroit SQL (`is_enrolled`, `can_access_course`) ; le personnel voit tout | Une règle unique évite qu'une table oublie la vérification ; les groupes l'ont étendue sans toucher aux autres règles |
| 2026-10-20 | Désinscription, retrait d'un groupe ou suppression d'un groupe : l'accès est retiré, les traces (contenus terminés, temps, tentatives) sont conservées | Historique consultable par le personnel (Qualiopi) ; effacement à traiter avec le RGPD |
| 2026-10-20 | Reprise de l'existant à la migration 0008 : tous les apprenants inscrits aux parcours déjà publiés ; `reset_demo.sql` fait de même | La démo continue de fonctionner à l'identique |
| 2026-10-20 | Groupes et inscriptions : réservés au personnel (RLS) ; un apprenant ne les voit pas ; un compte non apprenant ne peut être ni inscrit ni membre ; nom de groupe unique par organisme (casse ignorée) | Confidentialité entre apprenants, cohérence des données |
| 2026-10-20 | Duplication d'un parcours par fonction SQL `duplicate_course` (droits de l'appelant) + copie des PDF côté application ; copie en brouillon, sans inscriptions ni traces ; chaque copie a ses propres fichiers PDF | Atomicité en base ; supprimer un PDF d'une copie n'efface jamais celui de l'original |
| 2026-10-20 | Modification d'une question de quiz par fonction SQL `update_question` ; choix recréés, tentatives déjà enregistrées non recalculées | Pas de question à moitié modifiée ; l'historique des notes reste fidèle à ce que l'apprenant a vu |
| 2026-10-20 | Noms d'apprenants affichés « NOM Prénom » (suivi, exports CSV, attestation, listes d'inscription) et triés par nom de famille ; le nom de famille est le dernier mot du nom complet | Demande de Mélissa ; hypothèse à lever en séparant prénom et nom à l'étape 11 (limite : « Le Gall ») |
| 2026-10-20 | Tests sur base réelle : délai relevé à 30 s | Les tests passent par Internet ; 5 s provoquait des échecs aléatoires |
| 2026-10-09 | `@types/node` en v24 | Aligné sur Node 24 ; évite un conflit de dépendances avec Vitest |

## Plus tard (hors périmètre)
- Vitrine multi-pages (offre, tarifs, à propos, blog)
- Paiement / abonnements, IA générative intégrée, classes virtuelles
- SCORM / xAPI, notifications e-mail avancées, application mobile
- Sous-domaine par organisme, nom de domaine personnalisé

## Feuille de route vers la commercialisation
Classée par priorité. Marqueur : ⚠️ À REVOIR AVANT MISE EN VENTE. À traiter avec un développeur professionnel.

### Priorité 1 — Obligatoire avant tout pilote avec de vrais apprenants
1. ⚠️ **RGPD** : registre des traitements, information des personnes, droit d'accès / effacement (y compris tentatives de quiz et traces), durée de conservation, contrats de sous-traitance (Supabase, Vercel), politique de confidentialité, mentions légales du site.
2. ⚠️ **Sécurité** : audit de l'isolation entre organismes (règles RLS et fonctions SQL `submit_quiz_attempt`, `mark_content_done`, `track_course_time`), politique de mots de passe, double authentification, « mot de passe oublié », invitation des utilisateurs par e-mail (aujourd'hui : création par SQL), limitation des tentatives de connexion, sauvegardes, journal d'accès.
3. ⚠️ **Comptes de démo** : mot de passe unique et simple, tables d'authentification alimentées par SQL direct : à supprimer avant toute mise en production.

### Priorité 2 — Avant la mise en vente
4. ⚠️ **Conformité Qualiopi et attestation** : format « NOM Prénom » de l'attestation à valider ; mentions de l'attestation et colonnes des exports à valider avec Mélissa et un auditeur ; registre numéroté des attestations émises ; signature électronique ; modèle personnalisable ; évaluations à chaud / à froid ; émargement.
5. ⚠️ **Fiabilité des traces** : le temps passé mesure la présence active à l'écran (approximation, pas une preuve d'assiduité) ; « contenu terminé » est déclaratif ; la règle d'avancement est à valider.
6. ⚠️ **Quiz** : règle de notation à valider (points partiels ? pondération ?) ; questions non modifiables ni réordonnables après création ; pas de banque de questions, de tirage aléatoire ni de chronomètre.
7. ⚠️ **Hébergement de production** : environnements séparés (test / production), supervision, plan de reprise, nom de domaine, sous-domaine par organisme, e-mails transactionnels.
8. ⚠️ **Fichiers** : suppression d'un module / parcours = PDF et anciens logos laissés dans le stockage ; un PDF est lisible par tout membre de l'organisme qui connaît son chemin (contrôle d'accès au niveau du parcours à ajouter) ; pas de redimensionnement ni d'analyse antivirus des fichiers envoyés ; WebP non géré dans le PDF.
9. ⚠️ **Page d'accueil publique** : textes commerciaux, tarifs, mentions légales, adresse de contact réelle.

### Priorité 3 — Qualité et croissance
10. ⚠️ **Accessibilité (RGAA)** : audit complet (contrastes des couleurs choisies par les organismes, navigation au clavier, lecteurs d'écran) ; thème clair uniquement (pas de mode sombre).
11. ⚠️ **Performance à l'échelle** : pagination des listes, index, mise en cache, volumétrie ; les règles d'accès (`can_access_course`, `is_enrolled`) sont des fonctions SQL appelées ligne par ligne, à mesurer avec beaucoup de données ; la liste des apprenants (inscriptions, groupes) n'est pas paginée.
12. ⚠️ **Tests de bout en bout** (Playwright) en plus des tests unitaires et des tests sur base réelle ; la mesure du temps passé n'est pas testée dans un navigateur.
13. ⚠️ **Dépendances de développement** : `npm audit` signale 5 vulnérabilités « high » dans l'outil de lint (`eslint-config-next` → `braces`), sans effet en production ; à traiter à la prochaine montée de version.
14. ⚠️ SCORM / xAPI · facturation et abonnements · CGV / CGU · notifications e-mail · application mobile.
