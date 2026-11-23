import { Router } from 'express';
import { z } from 'zod';
import { bd } from '../../config/bd.js';
import { exigerPermission } from '../../middlewares/authentification.js';
import { valider } from '../../middlewares/valider.js';
import { diffuser } from '../../temps-reel/socket.js';
import { lireId } from '../../utils/http.js';

export const routeurReferences = Router();

// Toutes les listes utiles aux formulaires, en un seul appel
routeurReferences.get('/', async (req, res) => {
  const [[statuts], [categories], [boites], [roles], [employes]] = await Promise.all([
    bd.query('SELECT id, libelle, couleur, groupe, ordre, actif FROM statuts ORDER BY ordre, id'),
    bd.query('SELECT id, libelle, ordre, actif FROM categories ORDER BY ordre, id'),
    bd.query('SELECT id, nom, poste, actif FROM boites_vocales ORDER BY id'),
    bd.query('SELECT id, code, libelle FROM roles ORDER BY id'),
    bd.query(
      `SELECT u.id, u.nom_complet, r.code AS role FROM utilisateurs u JOIN roles r ON r.id = u.role_id
       WHERE u.actif = 1 ORDER BY u.nom_complet`,
    ),
  ]);
  res.json({ statuts, categories, boites, roles, employes });
});

// Administration des statuts et des motifs : on désactive au lieu de supprimer (l'historique reste lisible)
const texte = z.string().trim().min(1, 'Libellé requis').max(80, '80 caractères maximum');
const schemaStatut = z.object({
  libelle: texte,
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide'),
  groupe: z.enum(['en_attente', 'rappel', 'en_cours', 'termine'], { message: 'Groupe invalide' }),
  ordre: z.number().int().min(0).max(999),
  actif: z.boolean(),
});
const schemaCategorie = z.object({ libelle: texte, ordre: z.number().int().min(0).max(999), actif: z.boolean() });

function routesAdministrables(table, schema) {
  const colonnes = Object.keys(schema.shape); // noms fixés par le schéma, jamais par l'utilisateur
  routeurReferences.post(`/${table}`, exigerPermission('parametres:gerer'), valider(schema), async (req, res) => {
    const [resultat] = await bd.query(`INSERT INTO ${table} SET ?`, [req.donnees]);
    diffuser('references:modifiees');
    res.status(201).json({ id: resultat.insertId });
  });
  routeurReferences.put(`/${table}/:id`, exigerPermission('parametres:gerer'), valider(schema), async (req, res) => {
    const valeurs = colonnes.map((c) => req.donnees[c]);
    await bd.query(`UPDATE ${table} SET ${colonnes.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...valeurs, lireId(req.params.id)]);
    diffuser('references:modifiees');
    res.json({ ok: true });
  });
}

routesAdministrables('statuts', schemaStatut);
routesAdministrables('categories', schemaCategorie);
