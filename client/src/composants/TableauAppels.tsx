import type { PageAppels } from '../api/types';
import { Lien, useRoute } from '../routeur';
import { formaterDateCourte, formaterTelephone } from '../utils/format';
import { Icone } from './Icones';
import { BadgeStatut, EtatVide } from './Interface';

const COLONNES = [
  { cle: 'nom_appelant', libelle: 'Personne' },
  { cle: null, libelle: 'Téléphone' },
  { cle: 'recu_le', libelle: 'Reçu le' },
  { cle: null, libelle: 'Motif' },
  { cle: null, libelle: 'Boîte' },
  { cle: 'responsable', libelle: 'Responsable' },
  { cle: 'statut', libelle: 'Statut' },
  { cle: 'modifie_le', libelle: 'Modifié le' },
] as const;

interface Props {
  donnees: PageAppels | null;
  tri: string;
  ordre: 'asc' | 'desc';
  onTri: (colonne: string) => void;
  onPage: (page: number) => void;
}

export function TableauAppels({ donnees, tri, ordre, onTri, onPage }: Props) {
  const { naviguer } = useRoute();
  if (!donnees) return <Chargement />;
  if (!donnees.appels.length) return <div className="tableau-conteneur"><EtatVide icone="recherche">Aucun appel ne correspond à ces critères.</EtatVide></div>;
  const pages = Math.max(1, Math.ceil(donnees.total / donnees.par_page));

  return (
    <>
      <div className="tableau-conteneur">
        <table className="tableau">
          <thead>
            <tr>
              {COLONNES.map(({ cle, libelle }) => (
                <th key={libelle} scope="col" aria-sort={cle === tri ? (ordre === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {cle ? (
                    <button type="button" className="tri" onClick={() => onTri(cle)}>
                      {libelle}
                      <span className={`tri-icone ${cle === tri ? 'tri-actif' : ''}`}>
                        <Icone nom={cle === tri ? (ordre === 'asc' ? 'haut' : 'bas') : 'tri'} taille={13} />
                      </span>
                    </button>
                  ) : libelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {donnees.appels.map((a) => (
              <tr
                key={a.id}
                className="ligne-cliquable"
                onClick={(e) => !(e.target as HTMLElement).closest('a') && naviguer(`/appels/${a.id}`)}
              >
                <td data-etiquette="Personne">
                  <Lien vers={`/appels/${a.id}`}>{a.nom_appelant ?? 'Nom inconnu'}</Lien>
                  {a.consigne_confidentialite && <span className="pastille-confidentiel" title={a.consigne_confidentialite}><Icone nom="bouclier" taille={11} />Confidentiel</span>}
                </td>
                <td data-etiquette="Téléphone" className="sans-retour">{formaterTelephone(a.telephone)}</td>
                <td data-etiquette="Reçu le" className="sans-retour">{formaterDateCourte(a.recu_le)}</td>
                <td data-etiquette="Motif" className="sans-retour">{a.categorie ?? '—'}</td>
                <td data-etiquette="Boîte" className="sans-retour">{a.boite_vocale ?? 'Répondu'}</td>
                <td data-etiquette="Responsable">{a.responsable ?? <span className="discret">Non attribué</span>}</td>
                <td data-etiquette="Statut">
                  <BadgeStatut libelle={a.statut} couleur={a.statut_couleur} />
                  {a.rappel_par && <span className="pastille-rappel"><Icone nom="rappel" taille={11} />{a.rappel_par} rappelle</span>}
                </td>
                <td data-etiquette="Modifié le" className="sans-retour">{formaterDateCourte(a.modifie_le)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="pagination" aria-label="Pages">
        <button type="button" className="bouton bouton-secondaire" disabled={donnees.page <= 1} onClick={() => onPage(donnees.page - 1)}>
          <Icone nom="gauche" taille={16} /> Précédent
        </button>
        <span className="pagination-info">Page <strong>{donnees.page}</strong> sur {pages} · {donnees.total} appel(s)</span>
        <button type="button" className="bouton bouton-secondaire" disabled={donnees.page >= pages} onClick={() => onPage(donnees.page + 1)}>
          Suivant <Icone nom="droite" taille={16} />
        </button>
      </nav>
    </>
  );
}

// Lignes fantômes pendant le premier chargement
function Chargement() {
  return (
    <div className="tableau-conteneur squelette" aria-busy="true" aria-label="Chargement…">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="squelette-ligne" style={{ animationDelay: `${i * 80}ms` }} />)}
    </div>
  );
}
