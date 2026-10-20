# Plateforme e-learning en marque blanche (prototype)

Plateforme de formation pour organismes de formation : chaque organisme a son espace, à ses couleurs, avec des parcours, des quiz, du suivi et une attestation de fin de formation. **Prototype de démonstration : données fictives uniquement.**

> Pour présenter la plateforme à un prospect : voir [`docs/scenario-demo.md`](docs/scenario-demo.md).
> Pour l'organisation technique, les décisions et la feuille de route : voir [`CLAUDE.md`](CLAUDE.md).

## 1. Prérequis (à installer une seule fois)

- **Node.js** (version 20 ou plus) : https://nodejs.org → télécharger la version « LTS » et l'installer.
- **Git** : sur Mac, tape `git --version` dans le Terminal ; s'il n'est pas installé, le Mac te proposera de l'installer. Sur Windows : https://git-scm.com
- **VS Code** (éditeur de texte, facultatif mais pratique) : https://code.visualstudio.com
- Un compte gratuit **Supabase** (https://supabase.com) : c'est lui qui héberge la base de données et les connexions.

Pour vérifier, ouvre le **Terminal** (Mac : Cmd + Espace, tape « Terminal » ; Windows : menu Démarrer, tape « PowerShell ») :

```bash
node -v
git --version
```

Chaque commande doit afficher un numéro de version.

## 2. Préparer Supabase (une seule fois)

1. Crée un projet Supabase : région **Paris** ou **Francfort** (données en Union européenne), plan gratuit.
2. Dans **Project Settings → API Keys**, repère le **Project URL** et la clé **Publishable** (commence par `sb_publishable_`). Ne copie **jamais** la clé « secret ».
3. Copie `.env.example` en `.env.local`, puis colle ces deux valeurs :

```
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
```

Ce fichier ne part jamais sur Git. Sur un nouvel ordinateur, il faut le recréer.

4. Dans Supabase, ouvre **SQL Editor → New query**, colle le contenu de chacun de ces fichiers **dans cet ordre**, et clique sur **Run** à chaque fois (tu dois voir « Success ») :

| # | Fichier | Rôle |
|---|---|---|
| 1 | `supabase/migrations/0001_organizations_and_profiles.sql` | Organismes, utilisateurs, règles d'isolation |
| 2 | `supabase/seed.sql` | 2 organismes fictifs et 6 comptes de démo |
| 3 | `supabase/migrations/0002_logos_storage.sql` | Stockage des logos |
| 4 | `supabase/migrations/0003_courses.sql` | Parcours, modules, contenus |
| 5 | `supabase/seed_courses.sql` | 6 parcours fictifs (« lorem ipsum ») |
| 6 | `supabase/migrations/0004_quizzes.sql` | Quiz et calcul des scores |
| 7 | `supabase/seed_quizzes.sql` | 3 quiz fictifs |
| 8 | `supabase/migrations/0005_tracking.sql` | Suivi, temps passé, mentions légales |
| 9 | `supabase/seed_tracking.sql` | 3 apprenants de plus, activité et mentions fictives |
| 10 | `supabase/migrations/0006_update_question.sql` | Modification d'une question de quiz (étape 8) |
| 11 | `supabase/migrations/0007_duplicate_course.sql` | Duplication d'un parcours (étape 9) |

> Astuce Mac : `cat fichier.sql | LC_ALL=en_US.UTF-8 pbcopy` copie le fichier dans le presse-papiers en gardant les accents. Colle ensuite avec Cmd + V.
> Les projets Supabase gratuits s'endorment après environ 7 jours sans activité : dans ce cas, clique sur **Restore** dans leur tableau de bord.

## 3. Lancer le projet en local

Dans le Terminal, place-toi dans le dossier du projet (`cd` = « aller dans ce dossier ») :

```bash
cd chemin/vers/plateforme-elearning
npm install
npm run dev
```

`npm install` télécharge les briques nécessaires (à faire une fois). `npm run dev` démarre l'application : ouvre http://localhost:3000. Pour arrêter : `Ctrl + C` dans le Terminal.

## 4. Comptes de démonstration (données fictives)

**Mot de passe de tous les comptes :** `Demo-Elearning-2026!`

| Organisme | Rôle | Identifiant |
|---|---|---|
| Institut Horizon Formation (bleu) | Administrateur | `admin@horizon.test` |
| Institut Horizon Formation | Formateur | `formateur@horizon.test` |
| Institut Horizon Formation | Apprenant | `apprenant@horizon.test` (Léa), `thomas@horizon.test`, `camille@horizon.test` |
| Atelier Lumière Conseil (orange) | Administrateur | `admin@lumiere.test` |
| Atelier Lumière Conseil | Formateur | `formateur@lumiere.test` |
| Atelier Lumière Conseil | Apprenant | `apprenant@lumiere.test` (Inès), `julien@lumiere.test` |

Ce que chaque rôle voit :

- **Apprenant** : « Mes formations » (parcours publiés, progression), lecture, bouton « Marquer comme terminé », quiz, téléchargement de l'attestation quand le parcours est terminé.
- **Formateur** : « Mes parcours » (créer, modifier, réordonner, publier, quiz) et « Apprenants et suivi » (tableau, exports CSV, attestations).
- **Administrateur** : tout ce que fait le formateur, plus « Paramètres de l'organisme » (nom, couleur, logo, numéro de déclaration d'activité, signataire).

## 5. Lancer les tests

```bash
npm test                 # tests rapides de la logique (aucune connexion nécessaire)
npm run test:isolation   # tests sur ta vraie base Supabase : isolation, droits, scores, suivi
npm run typecheck        # vérification des types
npm run lint             # vérification du style du code
npm run build            # construction de la version de production
```

`npm test` doit afficher « passed » partout. `npm run test:isolation` nécessite `.env.local` rempli et les scripts SQL appliqués ; il crée des données temporaires qu'il supprime à la fin. Si tu vois « 429 », Supabase limite les connexions rapprochées : attends 5 minutes.

## 6. Rejouer la démo à zéro

Entre deux démos (tentatives de quiz limitées, couleurs modifiées), dans le SQL Editor : lance `supabase/reset_demo.sql`, puis `supabase/seed_tracking.sql`. Voir [`docs/scenario-demo.md`](docs/scenario-demo.md).

## 7. Sur un nouvel ordinateur (Windows par exemple)

1. Installe Node.js, Git et VS Code (section 1).
2. Récupère le dossier du projet (dépôt Git, ou archive zip sans `node_modules`).
3. Recrée `.env.local` (section 2) : il n'est jamais envoyé avec le code.
4. `npm install`, puis `npm run dev`. La base Supabase est la même : rien à réappliquer.

## 8. Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Adresse du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé « publishable » Supabase (jamais la clé secret) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Adresse affichée sur la page d'accueil pour « Demander une démonstration » (facultatif) |
