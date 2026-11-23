// Crée (ou recrée) la base de DÉVELOPPEMENT et la remplit de données FICTIVES.
// ⚠ Efface toutes les tables de la base indiquée dans .env. Refuse de tourner en production.
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const nomBd = process.env.BD_NOM ?? '';
if (process.env.NODE_ENV === 'production' || !/^[a-z0-9_]+_(dev|test)$/.test(nomBd)) {
  console.error('Refusé : BD_NOM doit finir par _dev ou _test, et NODE_ENV ne doit pas valoir production.');
  process.exit(1);
}

const connexion = await mysql.createConnection({
  host: process.env.BD_HOTE,
  port: Number(process.env.BD_PORT || 3306),
  user: process.env.BD_UTILISATEUR,
  password: process.env.BD_MOT_DE_PASSE,
  multipleStatements: true,
  charset: 'utf8mb4_unicode_ci',
});

await connexion.query(`CREATE DATABASE IF NOT EXISTS \`${nomBd}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await connexion.query(`USE \`${nomBd}\``);
await connexion.query("SET time_zone = '+00:00'");

// Les tables « enfants » d'abord, à cause des clés étrangères
const tables = ['journal_acces', 'historique_appels', 'suivis', 'notes_appel', 'appels', 'categories', 'statuts', 'boites_vocales', 'utilisateurs', 'roles', 'sessions'];
for (const table of tables) await connexion.query(`DROP TABLE IF EXISTS \`${table}\``);
await connexion.query(await readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8'));

// Comptes fictifs : un par rôle, même mot de passe de démonstration
const motDePasse = process.env.MOT_DE_PASSE_DEMO || 'Clinique2026!';
const hash = await bcrypt.hash(motDePasse, 12);
const comptes = [
  ['Alex Admin', 'admin@clinique.test', 1],
  ['Rosalie Réception', 'reception@clinique.test', 2],
  ['Émile Équipe', 'equipe@clinique.test', 3],
  ['Inès Infirmière', 'infirmiere@clinique.test', 4],
  ['Maxime Équipe', 'maxime@clinique.test', 3],
];
await connexion.query(
  'INSERT INTO utilisateurs (nom_complet, courriel, mot_de_passe_hash, role_id) VALUES ?',
  [comptes.map(([nom, courriel, role]) => [nom, courriel, hash, role])],
);

// 24 appels fictifs répartis sur les 7 derniers jours (numéros 555-01xx réservés à la fiction)
const noms = ['Julie Test', 'Sam Exemple', 'Ana Prueba', 'Marc Fictif', 'Léa Démo', null, 'Nora Essai', 'Paul Modèle'];
const descriptions = [
  'Souhaite prendre un rendez-vous, préfère être rappelée après 15 h.',
  'Veut annuler son rendez-vous de jeudi.',
  'Question sur les services offerts par la clinique.',
  'Demande de rappel, message court.',
  'Question sur un formulaire administratif.',
];
const langues = ['fr', 'fr', 'en', 'fr', 'es', 'fr'];
const maintenant = Date.now();
const appels = [];
for (let i = 0; i < 24; i++) {
  const recuLe = new Date(maintenant - (i * 7 + 1) * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const boite = i % 3 === 0 ? null : (i % 4) + 1;
  appels.push([
    noms[i % noms.length],
    `+1819555${String(100 + i).padStart(4, '0')}`,
    recuLe,
    (i % 5) + 1,
    descriptions[i % descriptions.length],
    langues[i % langues.length],
    i === 2 ? 'Ne pas laisser de message sur la boîte vocale' : null,
    boite,
    boite ? null : 2,
    i % 4 === 0 ? null : (i % 3) + 2,
    (i % 10) + 1,
    2,
  ]);
}
await connexion.query(
  `INSERT INTO appels (nom_appelant, telephone, recu_le, categorie_id, description, langue,
     consigne_confidentialite, boite_vocale_id, recu_par_id, responsable_id, statut_id, cree_par_id) VALUES ?`,
  [appels],
);
await connexion.query(
  "INSERT INTO historique_appels (appel_id, utilisateur_id, champ, nouvelle_valeur) SELECT id, 2, 'Création', 'Appel enregistré' FROM appels",
);
await connexion.query(
  `INSERT INTO notes_appel (appel_id, auteur_id, type, contenu) VALUES
     (1, 3, 'commentaire', 'J''essaie de la rappeler en fin de journée.'),
     (2, 4, 'note', 'Note fictive : vérifier la disponibilité de jeudi.')`,
);
await connexion.query(
  "INSERT INTO suivis (appel_id, utilisateur_id, action, details) VALUES (1, 3, 'message_laisse', 'Message laissé à 10 h')",
);

await connexion.end();
console.log(`Base « ${nomBd} » prête avec des données fictives.`);
console.log(`Comptes (mot de passe : ${motDePasse}) : ${comptes.map((c) => c[1]).join(', ')}`);
