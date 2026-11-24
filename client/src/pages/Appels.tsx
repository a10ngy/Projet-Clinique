import { useEffect, useState } from 'react';
import { api, versRequete } from '../api/client';
import type { PageAppels } from '../api/types';
import { FormulaireAppel } from '../composants/FormulaireAppel';
import { Icone } from '../composants/Icones';
import { Alerte, Champ, EntetePage } from '../composants/Interface';
import { TableauAppels } from '../composants/TableauAppels';
import { useAuth } from '../contexte/Authentification';
import { useReferences } from '../contexte/References';
import { useRoute } from '../routeur';
import { useTempsReel } from '../temps-reel';
import { debutJourneeIso, finJourneeIso, GROUPES, LANGUES } from '../utils/format';

const FILTRES_DEFAUT = {
  recherche: '', statut: '', groupe: '', responsable: '', boite: '', langue: '',
  du: '', au: '', archives: '', tri: 'recu_le', ordre: 'desc', page: '1',
};
type Filtres = typeof FILTRES_DEFAUT;
const TRI_CROISSANT = ['nom_appelant', 'responsable', 'statut'];

// Les filtres vivent dans l'adresse de la page : on peut la partager ou revenir en arrière sans les perdre
export function Appels({ mesSuivis = false }: { mesSuivis?: boolean }) {
  const { peut } = useAuth();
  const { statuts, boites, employes } = useReferences();
  const { chemin, recherche, naviguer } = useRoute();
  const filtres: Filtres = { ...FILTRES_DEFAUT, ...Object.fromEntries(new URLSearchParams(recherche)) };
  const [donnees, setDonnees] = useState<PageAppels | null>(null);
  const [erreur, setErreur] = useState('');
  const [creation, setCreation] = useState(false);
  const [plusDeFiltres, setPlusDeFiltres] = useState(false);

  const requeteApi = versRequete({
    recherche: filtres.recherche,
    statut: filtres.statut,
    groupe: filtres.groupe,
    responsable: mesSuivis ? undefined : filtres.responsable,
    boite: filtres.boite,
    langue: filtres.langue,
    du: filtres.du && debutJourneeIso(filtres.du),
    au: filtres.au && finJourneeIso(filtres.au),
    archives: filtres.archives === '1' ? '1' : undefined,
    mes_suivis: mesSuivis ? '1' : undefined,
    tri: filtres.tri,
    ordre: filtres.ordre,
    page: filtres.page,
  });

  const charger = () =>
    api<PageAppels>(`/appels${requeteApi}`)
      .then((d) => {
        setDonnees(d);
        setErreur('');
      })
      .catch((e: Error) => setErreur(e.message));

  useEffect(() => {
    const minuterie = setTimeout(charger, 250); // attend la fin de la frappe avant de chercher
    return () => clearTimeout(minuterie);
  }, [requeteApi]);
  useTempsReel(['appel:cree', 'appel:modifie', 'appel:activite'], charger);

  const changer = (nouveaux: Partial<Filtres>) =>
    naviguer(`${chemin}${versRequete({ ...filtres, page: '1', ...nouveaux })}`, true);
  const valeur = (cle: keyof Filtres) => ({
    value: filtres[cle],
    onChange: (e: { target: { value: string } }) => changer({ [cle]: e.target.value } as Partial<Filtres>),
  });
  const trier = (colonne: string) =>
    colonne === filtres.tri
      ? changer({ ordre: filtres.ordre === 'asc' ? 'desc' : 'asc' })
      : changer({ tri: colonne, ordre: TRI_CROISSANT.includes(colonne) ? 'asc' : 'desc' });

  return (
    <>
      <EntetePage
        surtitre={mesSuivis ? 'Mon travail' : 'Registre'}
        titre={mesSuivis ? 'Mes suivis' : 'Appels'}
        description={mesSuivis
          ? 'Les appels dont vous êtes responsable et qui ne sont pas terminés.'
          : 'Tous les appels et messages vocaux reçus par la clinique.'}
      >
        {peut('appels:creer') && (
          <button type="button" className="bouton" onClick={() => setCreation(true)}>
            <Icone nom="plus" taille={18} /> Nouvel appel
          </button>
        )}
      </EntetePage>

      <form className="filtres" role="search" onSubmit={(e) => e.preventDefault()}>
        <Champ etiquette="Rechercher">
          <span className="champ-avec-icone">
            <Icone nom="recherche" taille={16} />
            <input type="search" placeholder="Nom ou numéro" {...valeur('recherche')} />
          </span>
        </Champ>
        <button type="button" className="bouton bouton-secondaire bouton-filtres" onClick={() => setPlusDeFiltres(!plusDeFiltres)} aria-expanded={plusDeFiltres}>
          <Icone nom="filtre" taille={15} /> {plusDeFiltres ? 'Moins de filtres' : 'Plus de filtres'}
        </button>
        {/* Sur téléphone, ces filtres sont cachés tant qu'on ne les demande pas */}
        <div className={`filtres-avances ${plusDeFiltres ? 'ouvert' : ''}`}>
          <Champ etiquette="Étape">
            <select {...valeur('groupe')}>
              <option value="">Toutes</option>
              {Object.entries(GROUPES).map(([code, libelle]) => <option key={code} value={code}>{libelle}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Statut">
            <select {...valeur('statut')}>
              <option value="">Tous</option>
              {statuts.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
          </Champ>
          {!mesSuivis && (
            <Champ etiquette="Responsable">
              <select {...valeur('responsable')}>
                <option value="">Tous</option>
                <option value="aucun">Non attribué</option>
                {employes.map((u) => <option key={u.id} value={u.id}>{u.nom_complet}</option>)}
              </select>
            </Champ>
          )}
          <Champ etiquette="Boîte vocale">
            <select {...valeur('boite')}>
              <option value="">Toutes</option>
              {boites.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Langue">
            <select {...valeur('langue')}>
              <option value="">Toutes</option>
              {Object.entries(LANGUES).map(([code, libelle]) => <option key={code} value={code}>{libelle}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Du">
            <input type="date" {...valeur('du')} />
          </Champ>
          <Champ etiquette="Au">
            <input type="date" {...valeur('au')} />
          </Champ>
          <label className="case">
            <input type="checkbox" checked={filtres.archives === '1'} onChange={(e) => changer({ archives: e.target.checked ? '1' : '' })} />
            Archives
          </label>
          <button type="button" className="bouton bouton-fantome" onClick={() => naviguer(chemin, true)}>
            <Icone nom="fermer" taille={15} /> Effacer les filtres
          </button>
        </div>
      </form>

      {erreur && <Alerte type="erreur">{erreur}</Alerte>}
      <TableauAppels
        donnees={donnees}
        tri={filtres.tri}
        ordre={filtres.ordre === 'asc' ? 'asc' : 'desc'}
        onTri={trier}
        onPage={(page) => changer({ page: String(page) })}
      />

      {creation && (
        <FormulaireAppel
          onFermer={() => setCreation(false)}
          onEnregistre={(appel) => {
            setCreation(false);
            naviguer(`/appels/${appel.id}`);
          }}
        />
      )}
    </>
  );
}
