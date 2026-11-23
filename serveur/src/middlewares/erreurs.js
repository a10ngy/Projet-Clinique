// Erreurs MySQL fréquentes traduites en messages compréhensibles
const ERREURS_SQL = {
  ER_DUP_ENTRY: [409, 'Cette valeur existe déjà'],
  ER_NO_REFERENCED_ROW_2: [400, 'Une valeur choisie n’existe pas (statut, motif, employé…)'],
  ER_ROW_IS_REFERENCED_2: [409, 'Impossible : cet élément est utilisé ailleurs'],
};

export function routeIntrouvable(req, res) {
  res.status(404).json({ erreur: 'Route introuvable' });
}

// Le navigateur reçoit un message clair ; la console reçoit un code, jamais le contenu d'un appel
export function gestionErreurs(err, req, res, suivant) {
  const [statutSql, messageSql] = ERREURS_SQL[err.code] ?? [];
  const statut = err.statut ?? statutSql ?? (err.type === 'entity.parse.failed' ? 400 : 500);
  if (statut >= 500) {
    const detail = process.env.NODE_ENV === 'production' ? '' : ` ${err.message}`;
    console.error(`[erreur] ${req.method} ${req.originalUrl} ${err.code ?? err.name}${detail}`);
  }
  res.status(statut).json({
    erreur: err.messagePublic ?? messageSql ?? (statut === 400 ? 'Requête invalide' : 'Erreur interne du serveur'),
    champs: err.champs,
    details: err.details,
  });
}
