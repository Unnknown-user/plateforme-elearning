# Plateforme e-learning en marque blanche (prototype)

Prototype de plateforme de formation pour organismes de formation. **Données fictives uniquement.**

## 1. Prérequis (à installer une seule fois)
- **Node.js** (version 20 ou plus) : https://nodejs.org → télécharger la version « LTS » et l'installer.
- **Git** : sur Mac, tape `git --version` dans le Terminal ; s'il n'est pas installé, le Mac te proposera de l'installer. Sur Windows : https://git-scm.com
- **VS Code** (éditeur de texte, facultatif mais pratique) : https://code.visualstudio.com

Pour vérifier, ouvre le **Terminal** (Mac : Cmd + Espace, tape « Terminal » ; Windows : menu Démarrer, tape « PowerShell ») et tape :
```bash
node -v
git --version
```
Chaque commande doit afficher un numéro de version.

## 2. Lancer le projet en local
Dans le Terminal, place-toi dans le dossier du projet (`cd` = « aller dans ce dossier ») :
```bash
cd chemin/vers/plateforme-elearning
npm install
npm run dev
```
`npm install` télécharge les briques nécessaires (à faire une fois). `npm run dev` démarre l'application. Ouvre ensuite http://localhost:3000 dans ton navigateur : tu dois voir « Plateforme e-learning ». Pour arrêter : `Ctrl + C` dans le Terminal.

## 3. Lancer les tests
```bash
npm test
```
Tu dois voir « 1 passed » (le nombre augmentera à chaque étape). Autres vérifications : `npm run typecheck`, `npm run lint`, `npm run build`.

## 4. Variables secrètes
Copie `.env.example` en `.env.local` et remplis-le quand une étape te le demande. Ce fichier ne part jamais sur Git.

## 5. Comptes de démonstration
Ils seront créés à l'étape 2 (comptes et rôles), puis listés ici.

## Documentation du projet
Voir `CLAUDE.md` : périmètre, stack, décisions, avancement et feuille de route vers la commercialisation.

## 6. Comptes de démonstration (données fictives)
Pour te connecter : lance `npm run dev`, ouvre http://localhost:3000 puis « Accéder à mon espace ».
Il faut avoir appliqué `supabase/migrations/0001_organizations_and_profiles.sql` puis `supabase/seed.sql` dans Supabase (SQL Editor).
Mot de passe de tous les comptes : `Demo-Elearning-2026!`

| Organisme | Rôle | Identifiant |
|---|---|---|
| Institut Horizon Formation | Administrateur | admin@horizon.test |
| Institut Horizon Formation | Formateur | formateur@horizon.test |
| Institut Horizon Formation | Apprenant | apprenant@horizon.test |
| Atelier Lumière Conseil | Administrateur | admin@lumiere.test |
| Atelier Lumière Conseil | Formateur | formateur@lumiere.test |
| Atelier Lumière Conseil | Apprenant | apprenant@lumiere.test |

## 7. Test d'isolation entre organismes
```bash
npm run test:isolation
```
Ce test se connecte à ta vraie base Supabase avec chaque compte et vérifie que personne ne voit les données d'un autre organisme. Il faut `.env.local` rempli. Tu dois voir « 5 passed ».

## 8. Personnaliser un organisme (marque blanche)
Connecte-toi en **administrateur** (`admin@horizon.test`), ouvre « Paramètres de l'organisme » : change le nom, la couleur et le logo, puis « Enregistrer ». Toute l'interface de cet organisme change ; l'autre organisme reste inchangé.
Le logo (PNG, JPEG ou WebP, 1 Mo) peut être remplacé ou retiré (case « Retirer le logo actuel »). Prérequis : avoir appliqué `supabase/migrations/0002_logos_storage.sql` dans le SQL Editor de Supabase.

## 9. Parcours (étape 4)
Applique dans le SQL Editor de Supabase : `supabase/migrations/0003_courses.sql` puis `supabase/seed_courses.sql` (parcours fictifs en « lorem ipsum »).
- **Formateur / administrateur** : menu « Mes parcours » → créer un parcours, ajouter des modules, puis des contenus (texte, vidéo YouTube/Vimeo, PDF), publier ou repasser en brouillon, « Aperçu apprenant ».
- **Apprenant** (`apprenant@horizon.test`) : voit uniquement les parcours **publiés** de son organisme. Le parcours « Introduction au management d'équipe » est un brouillon : il n'apparaît pas pour lui.
