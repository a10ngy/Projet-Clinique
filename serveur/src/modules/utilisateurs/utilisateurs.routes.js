import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { bd } from '../../config/bd.js';
import { valider } from '../../middlewares/valider.js';
import { deconnecterUtilisateur, diffuser } from '../../temps-reel/socket.js';
import { erreurHttp, lireId } from '../../utils/http.js';
import { journaliser } from '../journal/journal.js';

// Toutes ces routes sont réservées à l'administration (vérifié dans app.js)
export const routeurUtilisateurs = Router();

const ROLES = ['admin', 'reception', 'equipe', 'infirmiere'];
const schemaCreation = z.object({
  nom_complet: z.string({ message: 'Nom requis' }).trim().min(2, 'Nom requis').max(120),
  courriel: z.string({ message: 'Courriel requis' }).trim().toLowerCase().email('Courriel invalide').max(190),
  role: z.enum(ROLES, { message: 'Rôle invalide' }),
  mot_de_passe: z.string({ message: 'Mot de passe requis' }).min(10, '10 caractères minimum').max(200),
});
const schemaModification = schemaCreation.partial().extend({ actif: z.boolean().optional() });

// Requête qui traduit un courriel en double en message clair
async function executer(sql, valeurs) {
  try {
    return await bd.query(sql, valeurs);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw erreurHttp(409, 'Ce courriel est déjà utilisé par un autre compte');
    throw err;
  }
}

routeurUtilisateurs.get('/', async (req, res) => {
  const [utilisateurs] = await bd.query(
    `SELECT u.id, u.nom_complet, u.courriel, r.code AS role, r.libelle AS role_libelle, u.actif, u.derniere_connexion,
            (SELECT COUNT(*) FROM appels a JOIN statuts s ON s.id = a.statut_id
             WHERE a.responsable_id = u.id AND s.groupe <> 'termine' AND a.archive_le IS NULL) AS suivis_ouverts
     FROM utilisateurs u JOIN roles r ON r.id = u.role_id ORDER BY u.actif DESC, u.nom_complet`,
  );
  res.json(utilisateurs);
});

routeurUtilisateurs.post('/', valider(schemaCreation), async (req, res) => {
  const { nom_complet, courriel, role, mot_de_passe } = req.donnees;
  const [resultat] = await executer(
    `INSERT INTO utilisateurs (nom_complet, courriel, mot_de_passe_hash, role_id)
     VALUES (?, ?, ?, (SELECT id FROM roles WHERE code = ?))`,
    [nom_complet, courriel, await bcrypt.hash(mot_de_passe, 12), role],
  );
  await journaliser(req, req.utilisateur.id, 'compte_cree', `utilisateur #${resultat.insertId}`);
  diffuser('references:modifiees');
  res.status(201).json({ id: resultat.insertId });
});

routeurUtilisateurs.patch('/:id', valider(schemaModification), async (req, res) => {
  const id = lireId(req.params.id);
  const { nom_complet, courriel, role, mot_de_passe, actif } = req.donnees;
  // Empêche l'administration de se bloquer elle-même
  if (id === req.utilisateur.id && (actif === false || (role && role !== 'admin'))) {
    throw erreurHttp(400, 'Vous ne pouvez pas désactiver votre propre compte ni retirer votre rôle d’administrateur');
  }
  const changements = { nom_complet, courriel, actif };
  if (mot_de_passe) changements.mot_de_passe_hash = await bcrypt.hash(mot_de_passe, 12);
  const colonnes = Object.keys(changements).filter((c) => changements[c] !== undefined);
  const morceaux = colonnes.map((c) => `${c} = ?`);
  const valeurs = colonnes.map((c) => changements[c]);
  if (role) {
    morceaux.push('role_id = (SELECT id FROM roles WHERE code = ?)');
    valeurs.push(role);
  }
  if (!morceaux.length) return res.json({ ok: true });
  const [resultat] = await executer(`UPDATE utilisateurs SET ${morceaux.join(', ')} WHERE id = ?`, [...valeurs, id]);
  if (resultat.affectedRows === 0) throw erreurHttp(404, 'Employé introuvable');

  if (actif === false) deconnecterUtilisateur(id); // ses sessions sont refusées dès la prochaine requête
  await journaliser(req, req.utilisateur.id, actif === false ? 'compte_desactive' : 'compte_modifie', `utilisateur #${id}`);
  diffuser('references:modifiees');
  res.json({ ok: true });
});
