import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Alerte } from '../../composants/Interface';
import { formaterDate } from '../../utils/format';

interface Entree {
  id: number;
  action: string;
  details: string | null;
  adresse_ip: string | null;
  cree_le: string;
  utilisateur: string | null;
}

const ACTIONS: Record<string, string> = {
  connexion: 'Connexion',
  connexion_refusee: 'Connexion refusée',
  deconnexion: 'Déconnexion',
  compte_cree: 'Compte créé',
  compte_modifie: 'Compte modifié',
  compte_desactive: 'Compte désactivé',
};

export function Journal() {
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api<Entree[]>('/journal').then(setEntrees).catch((e: Error) => setErreur(e.message));
  }, []);

  return (
    <>
      <h1>Journal des accès</h1>
      <p className="discret">Les 300 derniers événements de connexion et d’administration.</p>
      {erreur && <Alerte type="erreur">{erreur}</Alerte>}
      <div className="tableau-conteneur">
        <table className="tableau">
          <thead>
            <tr><th scope="col">Date</th><th scope="col">Employé</th><th scope="col">Action</th><th scope="col">Détails</th><th scope="col">Adresse IP</th></tr>
          </thead>
          <tbody>
            {entrees.map((e) => (
              <tr key={e.id} className={e.action === 'connexion_refusee' ? 'ligne-alerte' : ''}>
                <td data-etiquette="Date">{formaterDate(e.cree_le)}</td>
                <td data-etiquette="Employé">{e.utilisateur ?? 'Inconnu'}</td>
                <td data-etiquette="Action">{ACTIONS[e.action] ?? e.action}</td>
                <td data-etiquette="Détails">{e.details ?? '—'}</td>
                <td data-etiquette="Adresse IP">{e.adresse_ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
