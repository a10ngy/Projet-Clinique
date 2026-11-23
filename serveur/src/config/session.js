import session from 'express-session';
import creerMySQLStore from 'express-mysql-session';
import { configBd } from './bd.js';

if (!process.env.SECRET_SESSION || process.env.SECRET_SESSION.length < 32) {
  throw new Error('SECRET_SESSION manquant ou trop court dans .env (32 caractères minimum)');
}

const MySQLStore = creerMySQLStore(session);
const dureeMs = Number(process.env.DUREE_SESSION_MINUTES || 60) * 60 * 1000;

// Session côté serveur, rangée dans MySQL (table « sessions » créée automatiquement).
// Le cookie est illisible par JavaScript (httpOnly) et limité à notre site (sameSite).
export const sessionMiddleware = session({
  name: 'clinique.sid',
  secret: process.env.SECRET_SESSION,
  store: new MySQLStore({ ...configBd, clearExpired: true }),
  resave: false,
  saveUninitialized: false,
  rolling: true, // la durée repart à chaque requête : expiration après une période d'inactivité
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: dureeMs,
  },
});
