import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { bd } from '../../config/bd.js';
import { valider } from '../../middlewares/valider.js';
import { chargerUtilisateurActif, exigerConnexion } from '../../middlewares/authentification.js';
import { journaliser } from '../journal/journal.js';
import { erreurHttp } from '../../utils/http.js';

export const routeurAuth = Router();

// 10 essais par 15 minutes et par adresse IP
const limiteConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erreur: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const schemaConnexion = z.object({
  courriel: z.string({ message: 'Courriel requis' }).trim().toLowerCase().email('Courriel invalide'),
  mot_de_passe: z.string({ message: 'Mot de passe requis' }).min(1, 'Mot de passe requis').max(200),
});

// Comparaison factice si le courriel n'existe pas : le temps de réponse ne révèle pas quels comptes existent
const hashFactice = bcrypt.hashSync('compte-inexistant', 12);

routeurAuth.post('/connexion', limiteConnexion, valider(schemaConnexion), async (req, res) => {
  const { courriel, mot_de_passe } = req.donnees;
  const [[compte]] = await bd.query('SELECT id, mot_de_passe_hash, actif FROM utilisateurs WHERE courriel = ?', [courriel]);
  const motDePasseValide = await bcrypt.compare(mot_de_passe, compte?.mot_de_passe_hash ?? hashFactice);

  if (!compte || !motDePasseValide || !compte.actif) {
    await journaliser(req, compte?.id ?? null, 'connexion_refusee');
    throw erreurHttp(401, 'Courriel ou mot de passe incorrect');
  }

  // Nouvel identifiant de session après la connexion (protège contre le vol de session)
  await new Promise((ok, echec) => req.session.regenerate((err) => (err ? echec(err) : ok())));
  req.session.utilisateurId = compte.id;
  await bd.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [compte.id]);
  await journaliser(req, compte.id, 'connexion');
  res.json(await chargerUtilisateurActif(compte.id));
});

routeurAuth.post('/deconnexion', exigerConnexion, async (req, res) => {
  await journaliser(req, req.utilisateur.id, 'deconnexion');
  req.session.destroy(() => {
    res.clearCookie('clinique.sid');
    res.json({ ok: true });
  });
});

routeurAuth.get('/moi', exigerConnexion, (req, res) => {
  res.json(req.utilisateur);
});
