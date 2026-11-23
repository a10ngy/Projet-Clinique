import { Router } from 'express';
import { bd } from '../../config/bd.js';
import { exigerPermission } from '../../middlewares/authentification.js';

// Journal des accès : connexions, échecs, actions d'administration (jamais le contenu d'un appel)
export function journaliser(req, utilisateurId, action, details = null) {
  return bd.query(
    'INSERT INTO journal_acces (utilisateur_id, action, details, adresse_ip) VALUES (?, ?, ?, ?)',
    [utilisateurId, action, details, req.ip],
  );
}

export const routeurJournal = Router();

routeurJournal.get('/', exigerPermission('journal:voir'), async (req, res) => {
  const [entrees] = await bd.query(
    `SELECT j.id, j.action, j.details, j.adresse_ip, j.cree_le, u.nom_complet AS utilisateur
     FROM journal_acces j LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id
     ORDER BY j.id DESC LIMIT 300`,
  );
  res.json(entrees);
});
