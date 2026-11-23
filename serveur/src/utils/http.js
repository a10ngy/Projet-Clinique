// Erreur avec un code HTTP et un message sans danger pour le navigateur
export function erreurHttp(statut, messagePublic, details) {
  return Object.assign(new Error(messagePublic), { statut, messagePublic, details });
}

export function lireId(valeur) {
  const id = Number(valeur);
  if (!Number.isInteger(id) || id < 1) throw erreurHttp(400, 'Identifiant invalide');
  return id;
}
