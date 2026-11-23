// Fonctions « pures » (sans base de données) : faciles à tester avec npm test
import { echapperLike } from '../../utils/formats.js';

export const PAR_PAGE = 25;

// Le tri accepte seulement ces colonnes : un nom de colonne n'est jamais copié depuis la requête
const COLONNES_TRI = {
  recu_le: 'a.recu_le',
  nom_appelant: 'a.nom_appelant',
  statut: 's.ordre',
  responsable: 'r.nom_complet',
  modifie_le: 'a.modifie_le',
};

export function construireFiltres(filtres, utilisateurId) {
  const conditions = [filtres.archives === '1' ? 'a.archive_le IS NOT NULL' : 'a.archive_le IS NULL'];
  const valeurs = [];
  const ajouter = (condition, ...params) => {
    conditions.push(condition);
    valeurs.push(...params);
  };

  if (filtres.recherche) {
    const texte = `%${echapperLike(filtres.recherche)}%`;
    const chiffres = filtres.recherche.replace(/\D/g, '');
    if (chiffres.length >= 3) ajouter('(a.telephone LIKE ? OR a.nom_appelant LIKE ?)', `%${chiffres}%`, texte);
    else ajouter('a.nom_appelant LIKE ?', texte);
  }
  if (filtres.statut) ajouter('a.statut_id = ?', filtres.statut);
  if (filtres.groupe) ajouter('s.groupe = ?', filtres.groupe);
  if (filtres.responsable === 'aucun') ajouter('a.responsable_id IS NULL');
  else if (filtres.responsable) ajouter('a.responsable_id = ?', filtres.responsable);
  if (filtres.boite) ajouter('a.boite_vocale_id = ?', filtres.boite);
  if (filtres.langue) ajouter('a.langue = ?', filtres.langue);
  if (filtres.du) ajouter('a.recu_le >= ?', filtres.du);
  if (filtres.au) ajouter('a.recu_le < ?', filtres.au);
  if (filtres.mes_suivis === '1') ajouter("a.responsable_id = ? AND s.groupe <> 'termine'", utilisateurId);

  const sens = filtres.ordre === 'asc' ? 'ASC' : 'DESC';
  const colonne = COLONNES_TRI[filtres.tri] ?? COLONNES_TRI.recu_le;
  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    valeurs,
    // « IS NULL » d'abord : les valeurs vides (nom inconnu, non attribué) vont toujours à la fin
    orderBy: `ORDER BY ${colonne} IS NULL, ${colonne} ${sens}, a.id DESC`,
    limite: PAR_PAGE,
    decalage: (filtres.page - 1) * PAR_PAGE,
  };
}

// Champs suivis dans l'historique. « masque » : on note le changement sans recopier le texte.
const CHAMPS_HISTORIQUE = [
  ['nom_appelant', 'Nom'],
  ['telephone', 'Téléphone'],
  ['recu_le', 'Date de l’appel'],
  ['categorie', 'Motif'],
  ['langue', 'Langue'],
  ['boite_vocale', 'Boîte vocale'],
  ['recu_par', 'Reçu par'],
  ['responsable', 'Responsable'],
  ['statut', 'Statut'],
  ['description', 'Description', true],
  ['consigne_confidentialite', 'Consigne de confidentialité', true],
];

// Compare deux versions d'un appel (avec libellés) et liste ce qui a changé
export function calculerChangements(avant, apres) {
  return CHAMPS_HISTORIQUE.filter(([cle]) => (avant[cle] ?? null) !== (apres[cle] ?? null)).map(([cle, champ, masque]) => ({
    champ,
    ancienne: masque ? (avant[cle] ? '(texte précédent)' : null) : avant[cle] ?? null,
    nouvelle: masque ? (apres[cle] ? '(texte modifié)' : '(effacé)') : apres[cle] ?? null,
  }));
}
