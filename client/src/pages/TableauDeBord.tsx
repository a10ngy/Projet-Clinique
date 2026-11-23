import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { TableauDeBord as Donnees } from '../api/types';
import { useAuth } from '../contexte/Authentification';
import { Lien } from '../routeur';
import { useTempsReel } from '../temps-reel';
import { ACTIONS_SUIVI, debutJourneeIso, formaterDate } from '../utils/format';

const aujourdhui = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-JJ à l'heure locale

const CARTES = [
  { cle: 'recus_aujourdhui', libelle: 'Reçus aujourd’hui', vers: () => `/appels?du=${aujourdhui()}`, ton: 'neutre' },
  { cle: 'en_attente', libelle: 'En attente', vers: () => '/appels?groupe=en_attente', ton: 'info' },
  { cle: 'a_rappeler', libelle: 'À rappeler', vers: () => '/appels?groupe=rappel', ton: 'attention' },
  { cle: 'en_cours', libelle: 'En cours', vers: () => '/appels?groupe=en_cours', ton: 'neutre' },
  { cle: 'termines', libelle: 'Terminés (non archivés)', vers: () => '/appels?groupe=termine', ton: 'succes' },
  { cle: 'mes_suivis', libelle: 'Attribués à moi', vers: () => '/mes-suivis', ton: 'accent' },
] as const;

function decrire(a: Donnees['activite'][number]) {
  if (a.type === 'note') return a.detail === 'note' ? 'a ajouté une note' : 'a commenté';
  if (a.type === 'suivi') return `a noté : ${ACTIONS_SUIVI[a.detail]?.toLowerCase() ?? a.detail}`;
  return a.detail === 'Création' ? 'a enregistré l’appel' : `a modifié : ${a.detail.toLowerCase()}`;
}

export function TableauDeBord() {
  const { utilisateur } = useAuth();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState('');

  const charger = () =>
    api<Donnees>(`/tableau-de-bord?debut_journee=${encodeURIComponent(debutJourneeIso())}`)
      .then(setDonnees)
      .catch((e: Error) => setErreur(e.message));

  useEffect(() => {
    charger();
  }, []);
  useTempsReel(['appel:cree', 'appel:modifie', 'appel:activite'], charger);

  return (
    <>
      <h1>Bonjour {utilisateur?.nom_complet.split(' ')[0]}</h1>
      {erreur && <p className="alerte alerte-erreur">{erreur}</p>}
      <section className="cartes" aria-label="Indicateurs">
        {CARTES.map((c) => (
          <Lien key={c.cle} vers={c.vers()} className={`carte carte-${c.ton}`}>
            <span className="carte-nombre">{donnees ? donnees[c.cle] : '…'}</span>
            <span className="carte-libelle">{c.libelle}</span>
          </Lien>
        ))}
      </section>

      <section className="panneau">
        <h2>Activité récente de l’équipe</h2>
        {!donnees?.activite.length && <p className="vide">Aucune activité pour l’instant.</p>}
        <ul className="activite">
          {donnees?.activite.map((a, i) => (
            <li key={i}>
              <strong>{a.auteur}</strong> {decrire(a)} —{' '}
              <Lien vers={`/appels/${a.appel_id}`}>{a.nom_appelant ?? `appel n° ${a.appel_id}`}</Lien>
              <time className="discret">{formaterDate(a.cree_le)}</time>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
