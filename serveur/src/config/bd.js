import mysql from 'mysql2/promise';

export const configBd = {
  host: process.env.BD_HOTE,
  port: Number(process.env.BD_PORT || 3306),
  user: process.env.BD_UTILISATEUR,
  password: process.env.BD_MOT_DE_PASSE,
  database: process.env.BD_NOM,
};

// Pool de connexions. Toutes les requêtes utilisent des « ? » (requêtes préparées) contre les injections SQL.
export const bd = mysql.createPool({
  ...configBd,
  connectionLimit: 10,
  dateStrings: true,
  charset: 'utf8mb4_unicode_ci',
});

// Chaque connexion travaille en UTC ; React affiche ensuite l'heure locale
bd.on('connection', (connexion) => connexion.query("SET time_zone = '+00:00'"));
