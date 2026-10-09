# Scénario de démonstration prospect (15 minutes)

> Public : un responsable d'organisme de formation, ou une PME sans outil de formation.
> Objectif : qu'il se dise « je peux me voir dedans » et qu'il demande la suite (essai, devis, réunion).
> Tout ce qui est montré est fictif.

## Avant la démo

**La veille**
- Vérifie que le projet Supabase n'est pas en pause (tableau de bord Supabase : s'il l'est, clique sur « Restore »). Les projets gratuits s'endorment après environ 7 jours sans activité.
- Dans Supabase (SQL Editor), lance `supabase/reset_demo.sql` puis `supabase/seed_tracking.sql` : tout repart de l'état d'origine.
- Lance `npm run test:isolation` : « passed » partout = la base est saine.

**10 minutes avant**
- Terminal : `cd` dans le dossier du projet, puis `npm run dev`. Ouvre http://localhost:3000.
- Ouvre **3 onglets** du navigateur : la page d'accueil, et deux fenêtres de navigation privée (une pour chaque organisme) pour passer d'un compte à l'autre sans se déconnecter.
- Ferme les notifications, mets le navigateur en plein écran, zoom à 110 % si tu partages ton écran.
- Garde le mot de passe de démo sous la main (README, section 6).

## Les comptes

| Pour montrer… | Compte | Organisme |
|---|---|---|
| L'accueil d'un apprenant | `apprenant@horizon.test` (Léa) | Institut Horizon (bleu) |
| La création de contenu | `formateur@horizon.test` | Institut Horizon |
| La personnalisation et le suivi | `admin@horizon.test` | Institut Horizon |
| L'autre client (marque blanche) | `admin@lumiere.test` | Atelier Lumière (orange) |

## Déroulé minute par minute

**0:00 – 1:30 · L'accroche (page d'accueil)**
- « Voici une plateforme que vos apprenants verront à votre image. »
- Montre la page d'accueil, la partie « marque blanche », puis clique sur « Accéder à mon espace ».
- *Phrase-clé* : « J'ai conçu cet outil à partir de ce que je vis en formation : les preuves à fournir pour Qualiopi, les OPCO, le temps perdu à tout reconstituer. »

**1:30 – 4:30 · Le point de vue de l'apprenant (Léa)**
- Connexion avec `apprenant@horizon.test`. Montre les cartes avec la progression (en cours, non commencé, terminé).
- Ouvre « Accueillir et accompagner un nouvel arrivant » : textes, vidéo intégrée. Clique sur « Marquer comme terminé ».
- Ouvre le quiz : réponds, valide, montre le score et la **correction**. Note le nombre de tentatives.
- Ouvre le parcours déjà terminé (« Communication écrite professionnelle ») et **télécharge l'attestation**.
- *Phrase-clé* : « L'apprenant sait toujours où il en est, et repart avec sa preuve. »

**4:30 – 8:00 · Le point de vue du formateur**
- Connexion avec `formateur@horizon.test`. « Mes parcours » : indicateurs, cartes, brouillon et publié.
- Crée un nouveau parcours en 30 secondes (titre, durée, objectifs), ajoute un module, un texte, un lien vidéo.
- Montre que l'écran d'édition affiche **ce que voit l'apprenant**, avec « Modifier » et les flèches pour réordonner.
- Ajoute un quiz : seuil de réussite, tentatives, correction. Ajoute une question. Publie, puis « Aperçu apprenant ».
- *Phrase-clé* : « Pas de formation technique à prévoir : vos formateurs sont autonomes. »

**8:00 – 10:30 · La marque blanche (administrateur)**
- Connexion avec `admin@horizon.test`, « Paramètres de l'organisme » : change la couleur, ajoute un logo, enregistre. Tout change.
- Bascule sur la fenêtre de `admin@lumiere.test` : un autre client, ses propres couleurs, **aucune donnée d'Horizon**.
- *Phrase-clé* : « Chaque client a son espace, étanche, à son image. »

**10:30 – 13:30 · Le suivi et les preuves (le moment fort pour Qualiopi)**
- Retour sur `admin@horizon.test` : « Apprenants et suivi ». Montre le tableau : statut, progression, temps, quiz.
- Clique sur **Export du suivi (CSV)** et ouvre le fichier dans Excel. Même chose pour **Résultats aux quiz**.
- Clique sur le PDF d'un parcours terminé : l'attestation (organisme, numéro d'activité, objectifs, période, signataire).
- *Phrase-clé* : « En audit, vous montrez ce tableau et vous remettez l'attestation : tout est déjà rassemblé. »

**13:30 – 15:00 · Conclusion**
- Récapitule en 3 points : à leur image, simple à construire, preuves prêtes pour l'audit.
- Demande : « Qu'est-ce qui vous manque pour vous projeter ? » et propose la suite (essai avec leurs propres contenus, échange sur le tarif).

## Questions probables, réponses honnêtes

| Question | Réponse |
|---|---|
| Où sont hébergées les données ? | En Union européenne (Supabase, région UE). Pour le prototype, aucune vraie donnée n'est utilisée. |
| Et le RGPD ? | La plateforme est conçue pour limiter les données (nom, parcours, résultats). La mise en conformité complète (registre, mentions, sous-traitance, suppression de compte) est prévue avant la commercialisation. |
| Est-ce compatible SCORM ? | Pas dans cette version : c'est prévu dans la feuille de route. |
| Y a-t-il des classes virtuelles, des e-mails de relance, une application mobile ? | Pas encore. Le site s'adapte déjà aux téléphones. |
| Combien ça coûte ? | Tarif non défini à ce stade : ça dépend de ton retour de prospects. (À préparer avant la démo.) |
| Peut-on importer nos contenus ? | Textes, vidéos YouTube/Vimeo et PDF se déposent facilement. L'import en masse est dans la feuille de route. |
| Qui m'assure la maintenance ? | À définir avec le développeur qui reprendra le produit pour la mise en vente. |

> Ne promets jamais une fonction qui n'existe pas. « C'est prévu, voici comment tu pourrais en bénéficier » est une meilleure réponse.

## Si quelque chose ne marche pas (plan B)

| Problème | Solution |
|---|---|
| La page ne s'ouvre pas | Le serveur est arrêté : dans le Terminal, `npm run dev`, puis recharge. |
| « E-mail ou mot de passe incorrect » alors que c'est le bon | Le projet Supabase est peut-être en pause : tableau de bord Supabase > Restore. |
| Trop de tentatives de connexion (erreur 429) | Attends 5 minutes ; c'est une limite de Supabase. Prépare les sessions à l'avance. |
| Un quiz est épuisé (trop de tentatives) | Lance `supabase/reset_demo.sql` puis `supabase/seed_tracking.sql`. |
| Le prospect a un doute sur la sécurité | Montre le test d'isolation (`npm run test:isolation`) : il vérifie qu'un organisme ne voit jamais l'autre. |

## Après la démo
- Note ses questions et ce qui l'a le plus intéressé : cela guide les priorités de la feuille de route.
- Si un prospect veut un test avec de **vrais apprenants** : arrête-toi. Le volet RGPD doit être traité avant.
