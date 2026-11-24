import { useState, type FormEvent } from 'react';
import { api, ErreurApi } from '../../api/client';
import type { Categorie, Groupe, Statut } from '../../api/types';
import { Icone } from '../../composants/Icones';
import { Alerte, BadgeStatut, Champ, EntetePage, Modale } from '../../composants/Interface';
import { useReferences } from '../../contexte/References';
import { GROUPES } from '../../utils/format';

type Edition = { type: 'statuts'; element?: Statut } | { type: 'categories'; element?: Categorie };

// Statuts et motifs administrables. On désactive au lieu de supprimer : les anciens appels restent lisibles.
export function Parametres() {
  const { statuts, categories, recharger } = useReferences();
  const [edition, setEdition] = useState<Edition | null>(null);

  return (
    <>
      <EntetePage surtitre="Administration" titre="Statuts et motifs" description="Les listes proposées dans les formulaires et utilisées par le tableau de bord." />
      <section className="panneau">
        <div className="panneau-entete">
          <h2>Statuts de suivi</h2>
          <button type="button" className="bouton bouton-secondaire" onClick={() => setEdition({ type: 'statuts' })}><Icone nom="plus" taille={16} /> Ajouter un statut</button>
        </div>
        <p className="discret">L’étape sert au tableau de bord (en attente, à rappeler, en cours, terminé).</p>
        <ul className="liste-parametres">
          {statuts.map((s) => (
            <li key={s.id} className={s.actif ? '' : 'ligne-inactive'}>
              <BadgeStatut libelle={s.libelle} couleur={s.couleur} />
              <span className="discret">{GROUPES[s.groupe]} · ordre {s.ordre}{s.actif ? '' : ' · désactivé'}</span>
              <button type="button" className="bouton bouton-secondaire" onClick={() => setEdition({ type: 'statuts', element: s })}>Modifier</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panneau">
        <div className="panneau-entete">
          <h2>Motifs d’appel</h2>
          <button type="button" className="bouton bouton-secondaire" onClick={() => setEdition({ type: 'categories' })}><Icone nom="plus" taille={16} /> Ajouter un motif</button>
        </div>
        <ul className="liste-parametres">
          {categories.map((c) => (
            <li key={c.id} className={c.actif ? '' : 'ligne-inactive'}>
              <strong>{c.libelle}</strong>
              <span className="discret">ordre {c.ordre}{c.actif ? '' : ' · désactivé'}</span>
              <button type="button" className="bouton bouton-secondaire" onClick={() => setEdition({ type: 'categories', element: c })}>Modifier</button>
            </li>
          ))}
        </ul>
      </section>

      {edition && (
        <FormulaireParametre
          edition={edition}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null);
            recharger();
          }}
        />
      )}
    </>
  );
}

function FormulaireParametre({ edition, onFermer, onEnregistre }: { edition: Edition; onFermer: () => void; onEnregistre: () => void }) {
  const estStatut = edition.type === 'statuts';
  const statut = estStatut ? edition.element : undefined;
  const [champs, setChamps] = useState({
    libelle: edition.element?.libelle ?? '',
    couleur: statut?.couleur ?? '#2563eb',
    groupe: statut?.groupe ?? ('en_attente' as Groupe),
    ordre: String(edition.element?.ordre ?? 0),
    actif: edition.element ? Boolean(edition.element.actif) : true,
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const commun = { libelle: champs.libelle, ordre: Number(champs.ordre), actif: champs.actif };
    const corps = estStatut ? { ...commun, couleur: champs.couleur, groupe: champs.groupe } : commun;
    const chemin = `/references/${edition.type}${edition.element ? `/${edition.element.id}` : ''}`;
    try {
      await api(chemin, edition.element ? 'PUT' : 'POST', corps);
      onEnregistre();
    } catch (err) {
      setErreurs((err as ErreurApi).champs ?? {});
      setMessage((err as Error).message);
    }
  }

  return (
    <Modale titre={`${edition.element ? 'Modifier' : 'Ajouter'} ${estStatut ? 'un statut' : 'un motif'}`} onFermer={onFermer}>
      <form className="formulaire" onSubmit={enregistrer}>
        {message && <Alerte type="erreur">{message}</Alerte>}
        <div className="grille-champs">
          <Champ etiquette="Libellé *" erreur={erreurs.libelle}>
            <input value={champs.libelle} maxLength={80} onChange={(e) => setChamps({ ...champs, libelle: e.target.value })} required />
          </Champ>
          <Champ etiquette="Ordre d’affichage" erreur={erreurs.ordre}>
            <input type="number" min={0} max={999} value={champs.ordre} onChange={(e) => setChamps({ ...champs, ordre: e.target.value })} />
          </Champ>
          {estStatut && (
            <>
              <Champ etiquette="Étape (tableau de bord)" erreur={erreurs.groupe}>
                <select value={champs.groupe} onChange={(e) => setChamps({ ...champs, groupe: e.target.value as Groupe })}>
                  {Object.entries(GROUPES).map(([code, libelle]) => <option key={code} value={code}>{libelle}</option>)}
                </select>
              </Champ>
              <Champ etiquette="Couleur" erreur={erreurs.couleur}>
                <input type="color" value={champs.couleur} onChange={(e) => setChamps({ ...champs, couleur: e.target.value })} />
              </Champ>
            </>
          )}
          <label className="case">
            <input type="checkbox" checked={champs.actif} onChange={(e) => setChamps({ ...champs, actif: e.target.checked })} />
            Actif (proposé dans les formulaires)
          </label>
        </div>
        <footer className="modale-actions">
          <button type="button" className="bouton bouton-secondaire" onClick={onFermer}>Annuler</button>
          <button type="submit" className="bouton">Enregistrer</button>
        </footer>
      </form>
    </Modale>
  );
}
