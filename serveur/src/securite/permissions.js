// Qui peut faire quoi. Le serveur vérifie toujours ; React ne fait que cacher les boutons.
const COMMUNES = ['appels:voir', 'appels:creer', 'appels:commenter'];

export const PERMISSIONS_PAR_ROLE = {
  admin: [...COMMUNES, 'appels:modifier_tous', 'appels:archiver', 'parametres:gerer', 'utilisateurs:gerer', 'journal:voir'],
  reception: [...COMMUNES, 'appels:modifier_tous', 'appels:archiver'],
  equipe: [...COMMUNES, 'appels:modifier_siens'],
  infirmiere: [...COMMUNES, 'appels:modifier_siens'],
};

export const permissionsDuRole = (role) => PERMISSIONS_PAR_ROLE[role] ?? [];

export const peut = (role, permission) => permissionsDuRole(role).includes(permission);

// « Ses suivis » = les appels dont la personne est responsable, ou ceux que personne n'a encore pris
export function peutModifierAppel(utilisateur, appel) {
  if (peut(utilisateur.role, 'appels:modifier_tous')) return true;
  const sien = appel.responsable_id === utilisateur.id || appel.responsable_id === null;
  return sien && peut(utilisateur.role, 'appels:modifier_siens');
}
