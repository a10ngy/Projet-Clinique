import { bd } from '../config/bd.js';
import { peut, permissionsDuRole } from '../securite/permissions.js';
import { erreurHttp } from '../utils/http.js';

export async function chargerUtilisateurActif(id) {
  const [[utilisateur]] = await bd.query(
    `SELECT u.id, u.nom_complet, u.courriel, r.code AS role, r.libelle AS role_libelle
     FROM utilisateurs u JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.actif = 1`,
    [id],
  );
  return utilisateur ? { ...utilisateur, permissions: permissionsDuRole(utilisateur.role) } : null;
}

// Vérifie la session ET relit le compte à chaque requête : un compte désactivé est refusé aussitôt
export async function exigerConnexion(req, res, suivant) {
  const utilisateur = req.session.utilisateurId ? await chargerUtilisateurActif(req.session.utilisateurId) : null;
  if (!utilisateur) {
    req.session.destroy(() => {});
    throw erreurHttp(401, 'Veuillez vous connecter');
  }
  req.utilisateur = utilisateur;
  suivant();
}

export const exigerPermission = (permission) => (req, res, suivant) => {
  if (!peut(req.utilisateur.role, permission)) {
    throw erreurHttp(403, "Vous n'avez pas la permission d'effectuer cette action");
  }
  suivant();
};
