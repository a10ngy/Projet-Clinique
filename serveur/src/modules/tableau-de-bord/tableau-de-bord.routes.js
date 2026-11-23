import { Router } from 'express';
import { z } from 'zod';
import { bd } from '../../config/bd.js';
import { valider } from '../../middlewares/valider.js';
import { versDateSql } from '../../utils/formats.js';

export const routeurTableauDeBord = Router();

// debut_journee : minuit à l'heure locale du navigateur, envoyé en ISO (le serveur ne devine pas le fuseau)
const schema = z.object({ debut_journee: z.string().datetime({ offset: true }).transform(versDateSql) });

routeurTableauDeBord.get('/', valider(schema, 'query'), async (req, res) => {
  const [[[compteurs]], [activite]] = await Promise.all([
    bd.query(
      `SELECT SUM(a.recu_le >= ?) AS recus_aujourdhui,
              SUM(s.groupe = 'en_attente') AS en_attente,
              SUM(s.groupe = 'rappel') AS a_rappeler,
              SUM(s.groupe = 'en_cours') AS en_cours,
              SUM(s.groupe = 'termine') AS termines,
              SUM(a.responsable_id = ? AND s.groupe <> 'termine') AS mes_suivis
       FROM appels a JOIN statuts s ON s.id = a.statut_id
       WHERE a.archive_le IS NULL`,
      [req.donnees.debut_journee, req.utilisateur.id],
    ),
    // Les 15 dernières actions de l'équipe, toutes sources confondues
    bd.query(
      `(SELECT 'modification' AS type, h.appel_id, h.champ AS detail, u.nom_complet AS auteur, a.nom_appelant, h.cree_le
        FROM historique_appels h JOIN utilisateurs u ON u.id = h.utilisateur_id JOIN appels a ON a.id = h.appel_id
        ORDER BY h.id DESC LIMIT 15)
       UNION ALL
       (SELECT 'note', n.appel_id, n.type, u.nom_complet, a.nom_appelant, n.cree_le
        FROM notes_appel n JOIN utilisateurs u ON u.id = n.auteur_id JOIN appels a ON a.id = n.appel_id
        ORDER BY n.id DESC LIMIT 15)
       UNION ALL
       (SELECT 'suivi', su.appel_id, su.action, u.nom_complet, a.nom_appelant, su.cree_le
        FROM suivis su JOIN utilisateurs u ON u.id = su.utilisateur_id JOIN appels a ON a.id = su.appel_id
        ORDER BY su.id DESC LIMIT 15)
       ORDER BY cree_le DESC LIMIT 15`,
    ),
  ]);
  // SUM renvoie du texte (ou NULL si aucune ligne) : on convertit en nombres
  const nombres = Object.fromEntries(Object.entries(compteurs).map(([cle, valeur]) => [cle, Number(valeur ?? 0)]));
  res.json({ ...nombres, activite });
});
