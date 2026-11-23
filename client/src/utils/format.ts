import type { Appel, Utilisateur } from '../api/types';

// MySQL renvoie l'heure UTC ('2026-11-19 15:00:00') ; on l'affiche à l'heure de l'ordinateur
const versDate = (utc: string) => new Date(`${utc.replace(' ', 'T')}Z`);

export function formaterDate(utc?: string | null) {
  return utc ? versDate(utc).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

// Version courte pour les tableaux : « 19 nov., 14 h 02 »
export function formaterDateCourte(utc?: string | null) {
  return utc ? versDate(utc).toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
}

export function formaterTelephone(e164?: string | null) {
  return e164?.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '$1 $2-$3') ?? '';
}

// Valeur d'un champ <input type="datetime-local"> (heure locale) <-> ISO
export function versChampLocal(utc?: string | null) {
  const d = utc ? versDate(utc) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const versIso = (valeurLocale: string) => new Date(valeurLocale).toISOString();

export function debutJourneeIso(jour?: string) {
  const d = jour ? new Date(`${jour}T00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Fin d'une journée choisie = minuit du lendemain (filtre « au » inclusif)
export function finJourneeIso(jour: string) {
  const d = new Date(`${jour}T00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export const chiffres =(texte: string) => texte.replace(/\D/g, '');

// Même règle que le serveur, seulement pour afficher ou cacher les boutons
export function peutModifierAppel(utilisateur: Utilisateur, appel: Pick<Appel, 'responsable_id'>) {
  if (utilisateur.permissions.includes('appels:modifier_tous')) return true;
  const sien = appel.responsable_id === utilisateur.id || appel.responsable_id === null;
  return sien && utilisateur.permissions.includes('appels:modifier_siens');
}

export const LANGUES: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  autre: 'Autre',
};

export const ACTIONS_SUIVI: Record<string, string> = {
  rappel_en_cours: 'Rappel en cours',
  message_laisse: 'Message laissé',
  aucune_reponse: 'Aucune réponse',
  cliente_rejointe: 'Cliente rejointe',
  rappel_prevu: 'Rappel prévu',
  transfere: 'Transféré',
  autre: 'Autre action',
};

export const GROUPES: Record<string, string> = {
  en_attente: 'En attente',
  rappel: 'À rappeler',
  en_cours: 'En cours',
  termine: 'Terminé',
};
