# Gestion des appels — Clinique des femmes de l'Outaouais

Application web interne pour centraliser les appels et les messages vocaux, attribuer les suivis, noter les actions et collaborer en temps réel. Frontend React + TypeScript (Vite), backend Node.js + Express, base MySQL, temps réel avec Socket.IO.

> **Données fictives seulement.** Aucun renseignement réel de cliente ne doit être saisi avant que la clinique ait validé la sécurité et la confidentialité de l'application.

Tout le code est en français : variables, fonctions, fichiers, routes (`/api/appels`), tables et colonnes (`appels.nom_appelant`). Les noms sont écrits sans accents pour éviter les problèmes de compatibilité. Les mots imposés par les bibliothèques (`useState`, `express.Router`, etc.) restent en anglais.

## Ce qu'il faut sur l'ordinateur

Node.js 22 ou plus récent (`node -v` pour vérifier), MySQL 8 ou MariaDB (XAMPP convient), VS Code et Git.

## 1. Installer le serveur

Dans le terminal de VS Code :

```bash
cd serveur
npm install
copy .env.exemple .env          # PowerShell : Copy-Item .env.exemple .env   ·   Mac/Linux : cp .env.exemple .env
```

Ouvre `serveur/.env` et remplis deux valeurs. `BD_MOT_DE_PASSE` est le mot de passe MySQL (vide par défaut avec XAMPP). `SECRET_SESSION` doit contenir au moins 32 caractères aléatoires ; cette commande en génère :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Créer la base de développement

MySQL doit être démarré. Ensuite :

```bash
npm run bd:init
```

Le script crée la base `clinique_appels_dev`, ses 10 tables, les statuts, les motifs, les 4 boîtes vocales, 5 comptes fictifs et 24 appels fictifs. Il **efface** la base indiquée dans `.env` à chaque exécution, et refuse de tourner si le nom ne finit pas par `_dev` ou `_test`.

## 3. Lancer l'application

Il faut deux terminaux dans VS Code (bouton « + » du panneau Terminal).

```bash
# Terminal 1
cd serveur
npm run dev
```

Ouvre http://127.0.0.1:3001/api/sante dans le navigateur. La réponse attendue est `{"serveur":"ok","baseDeDonnees":"connectée"}`.

```bash
# Terminal 2
cd client
npm install
npm run dev
```

Ouvre http://localhost:5173.

## 4. Comptes fictifs

Le mot de passe de tous les comptes est `Clinique2026!` (modifiable avec `MOT_DE_PASSE_DEMO` dans `.env`).

| Courriel | Rôle |
| --- | --- |
| admin@clinique.test | Administrateur |
| reception@clinique.test | Réceptionniste |
| equipe@clinique.test | Membre de l'équipe |
| infirmiere@clinique.test | Infirmière |
| maxime@clinique.test | Membre de l'équipe |

## 5. Vérifier chaque étape

**Connexion et rôles.** Un mauvais mot de passe affiche « Courriel ou mot de passe incorrect ». Avec `equipe@clinique.test`, les menus d'administration n'apparaissent pas, et la fiche d'un appel attribué à quelqu'un d'autre ne peut pas être modifiée.

**Appels.** Dans « Appels », essaie la recherche par numéro (`819 555 0102`), les filtres et le tri en cliquant sur les en-têtes. « + Nouvel appel » refuse un numéro de moins de 10 chiffres et une date future.

**Fiche et suivis.** Ouvre un appel, change son statut, ajoute un commentaire et une action de suivi, puis clique sur « Je rappelle ». Chaque changement apparaît dans l'historique avec ton nom.

**Temps réel.** Ouvre l'application dans Chrome avec un compte, et dans une fenêtre de navigation privée avec un autre compte. Une modification faite d'un côté apparaît de l'autre sans rafraîchir.

**Conflits.** Dans les deux fenêtres, ouvre « Modifier » sur le même appel. Enregistre d'un côté, puis de l'autre : le second reçoit « Cet appel vient d'être modifié par… » au lieu d'écraser le travail du premier.

**Administration** (compte admin). Ajoute un employé, désactive-le (sa session est coupée aussitôt), ajoute un statut, puis consulte le journal des accès.

## Tests automatiques

```bash
cd serveur
npm test             # 12 tests : permissions, validation, filtres, historique (sans MySQL)

cd ../client
npm run verifier     # vérification des types TypeScript
```

## Organisation

```
serveur/
  sql/schema.sql                 structure des tables + données de référence
  scripts/initialiser-bd.js      base de développement avec données fictives
  src/serveur.js                 démarre HTTP + Socket.IO
  src/app.js                     Express : sécurité, sessions, routes
  src/config/                    connexion MySQL, sessions
  src/middlewares/               connexion obligatoire, permissions, validation, erreurs
  src/securite/permissions.js    qui peut faire quoi
  src/modules/                   auth, appels, references, tableau-de-bord, utilisateurs, journal
  src/temps-reel/socket.js       événements Socket.IO
  src/integrations/              réservé à ComUnik, aux transcriptions et à l'IA (phase 2)
  test/                          tests automatiques
client/
  src/api/                       appels à l'API et types TypeScript
  src/contexte/                  utilisateur connecté, listes de référence
  src/composants/                menu, tableau des appels, formulaire, fenêtre modale
  src/pages/                     tableau de bord, appels, fiche, administration
  src/routeur.tsx                navigation entre les pages (sans dépendance)
  src/temps-reel.ts              connexion Socket.IO
  src/styles/global.css          apparence
```

## Sécurité

Déjà en place : mots de passe hachés (bcrypt), sessions côté serveur dans MySQL avec cookie `httpOnly` et `sameSite`, nouvelle session à chaque connexion, limite de 10 essais de connexion par 15 minutes, permissions vérifiées par le serveur sur chaque route, validation de toutes les données (zod), requêtes SQL préparées, en-têtes de sécurité (helmet), journal des accès, historique de chaque modification, et aucun contenu d'appel dans les journaux du serveur.

À faire avant toute mise en production : HTTPS, `NODE_ENV=production`, sauvegardes chiffrées avec restauration testée, politique de conservation, changement de mot de passe à la première connexion, et validation par la clinique (évaluation des facteurs relatifs à la vie privée, Loi 25).

## Transparence

Ce projet a été généré avec l'aide de Claude (IA), puis doit être relu, testé et compris par l'équipe. Indique-le dans le pourcentage de code écrit par toi que demande le professeur.
