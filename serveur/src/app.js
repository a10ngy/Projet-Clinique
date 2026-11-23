import express from 'express';
import helmet from 'helmet';
import { bd } from './config/bd.js';
import { sessionMiddleware } from './config/session.js';
import { exigerConnexion, exigerPermission } from './middlewares/authentification.js';
import { gestionErreurs, routeIntrouvable } from './middlewares/erreurs.js';
import { routeurAuth } from './modules/auth/auth.routes.js';
import { routeurAppels } from './modules/appels/appels.routes.js';
import { routeurReferences } from './modules/references/references.routes.js';
import { routeurTableauDeBord } from './modules/tableau-de-bord/tableau-de-bord.routes.js';
import { routeurUtilisateurs } from './modules/utilisateurs/utilisateurs.routes.js';
import { routeurJournal } from './modules/journal/journal.js';

export function creerApp() {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1); // derrière le serveur HTTPS
  app.use(helmet()); // en-têtes de sécurité HTTP
  app.use(express.json({ limit: '100kb' }));
  app.use(sessionMiddleware);

  // Vérifie que le serveur et MySQL répondent (utile pour tester l'installation)
  app.get('/api/sante', async (req, res) => {
    await bd.query('SELECT 1');
    res.json({ serveur: 'ok', baseDeDonnees: 'connectée' });
  });

  app.use('/api/auth', routeurAuth);
  // Tout le reste exige une session valide
  app.use('/api/references', exigerConnexion, routeurReferences);
  app.use('/api/appels', exigerConnexion, routeurAppels);
  app.use('/api/tableau-de-bord', exigerConnexion, routeurTableauDeBord);
  app.use('/api/utilisateurs', exigerConnexion, exigerPermission('utilisateurs:gerer'), routeurUtilisateurs);
  app.use('/api/journal', exigerConnexion, routeurJournal);

  app.use('/api', routeIntrouvable);
  app.use(gestionErreurs);
  return app;
}
