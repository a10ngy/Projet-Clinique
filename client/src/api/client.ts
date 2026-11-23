export class ErreurApi extends Error {
  statut: number;
  champs: Record<string, string>;
  details: Record<string, unknown>;

  constructor(message: string, statut: number, champs?: Record<string, string>, details?: Record<string, unknown>) {
    super(message);
    this.statut = statut;
    this.champs = champs ?? {};
    this.details = details ?? {};
  }
}

// Point d'entrée unique vers l'API. Le cookie de session suit automatiquement (même adresse).
export async function api<T = unknown>(chemin: string, methode = 'GET', corps?: unknown): Promise<T> {
  const reponse = await fetch(`/api${chemin}`, {
    method: methode,
    headers: corps === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (reponse.status === 401 && chemin !== '/auth/connexion') window.dispatchEvent(new Event('session-expiree'));
  if (!reponse.ok) {
    throw new ErreurApi(donnees.erreur ?? `Le serveur ne répond pas (${reponse.status})`, reponse.status, donnees.champs, donnees.details);
  }
  return donnees as T;
}

// Construit « ?a=1&b=2 » en ignorant les valeurs vides
export function versRequete(parametres: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (valeur !== undefined && valeur !== '') p.set(cle, String(valeur));
  }
  const texte = p.toString();
  return texte ? `?${texte}` : '';
}
