import { useEffect, useState, type FormEvent } from 'react';
import { api, ErreurApi } from '../api/client';
import type { FicheAppel as Fiche } from '../api/types';
import { FormulaireAppel } from '../composants/FormulaireAppel';
import { Alerte, BadgeStatut, Champ } from '../composants/Interface';
import { useAuth } from '../contexte/Authentification';
import { useReferences } from '../contexte/References';
import { Lien } from '../routeur';
import { useTempsReel } from '../temps-reel';
import { ACTIONS_SUIVI, formaterDate, formaterTelephone, LANGUES, peutModifierAppel, versIso } from '../utils/format';

// Rend lisibles les valeurs de l'historique (dates UTC, numéros, codes de langue)
function lisible(champ: string, valeur: string | null) {
  if (valeur === null) return '—';
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valeur)) return formaterDate(valeur);
  if (/^\+1\d{10}$/.test(valeur)) return formaterTelephone(valeur);
  if (champ === 'Langue') return LANGUES[valeur] ?? valeur;
  return valeur;
}

export function FicheAppel({ id }: { id: number }) {
  const { utilisateur, peut } = useAuth();
  const { statuts, employes } = useReferences();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [erreur, setErreur] = useState('');
  const [avertissement, setAvertissement] = useState('');
  const [edition, setEdition] = useState(false);
  const [note, setNote] = useState({ type: 'commentaire', contenu: '' });
  const [suivi, setSuivi] = useState({ action: 'message_laisse', details: '', prochain_rappel_le: '' });

  const charger = () =>
    api<Fiche>(`/appels/${id}`)
      .then((f) => {
        setFiche(f);
        setErreur('');
      })
      .catch((e: Error) => setErreur(e.message));

  useEffect(() => {
    charger();
  }, [id]);
  // Quelqu'un d'autre modifie cet appel : la fiche se met à jour toute seule
  useTempsReel(['appel:modifie', 'appel:activite'], (d) => d.id === id && charger());

  // Exécute une action ; un conflit (409) affiche un avertissement au lieu d'écraser le travail d'un collègue
  async function agir(action: () => Promise<unknown>) {
    setAvertissement('');
    try {
      await action();
      await charger();
      return true;
    } catch (err) {
      const e = err as ErreurApi;
      setAvertissement(e.message);
      if (e.statut === 409) await charger();
      return false;
    }
  }

  if (erreur && !fiche) return <Alerte type="erreur">{erreur}</Alerte>;
  if (!fiche || !utilisateur) return <p className="vide">Chargement…</p>;

  const modifiable = peutModifierAppel(utilisateur, fiche);
  const changerChamp = (champ: 'statut_id' | 'responsable_id', valeur: string) =>
    agir(() => api(`/appels/${id}`, 'PATCH', { [champ]: valeur ? Number(valeur) : null, version: fiche.version }));

  async function prendreRappel() {
    try {
      await api(`/appels/${id}/rappel`, 'POST', { forcer: false });
    } catch (err) {
      const e = err as ErreurApi;
      if (e.statut !== 409 || !window.confirm(`${e.message} Voulez-vous quand même la rappeler ?`)) return setAvertissement(e.message);
      await api(`/appels/${id}/rappel`, 'POST', { forcer: true });
    }
    charger();
  }

  async function ajouterNote(e: FormEvent) {
    e.preventDefault();
    if (await agir(() => api(`/appels/${id}/notes`, 'POST', note))) setNote({ ...note, contenu: '' });
  }

  async function ajouterSuivi(e: FormEvent) {
    e.preventDefault();
    const corps = {
      action: suivi.action,
      details: suivi.details || null,
      prochain_rappel_le: suivi.prochain_rappel_le ? versIso(suivi.prochain_rappel_le) : null,
    };
    if (await agir(() => api(`/appels/${id}/suivis`, 'POST', corps))) setSuivi({ ...suivi, details: '', prochain_rappel_le: '' });
  }

  return (
    <>
      <Lien vers="/appels" className="retour">← Retour aux appels</Lien>
      <div className="titre-page">
        <div>
          <h1>{fiche.nom_appelant ?? 'Nom inconnu'}</h1>
          <p className="sous-titre">
            <a href={`tel:${fiche.telephone}`}>{formaterTelephone(fiche.telephone)}</a> · reçu le {formaterDate(fiche.recu_le)} ·{' '}
            <BadgeStatut libelle={fiche.statut} couleur={fiche.statut_couleur} />
          </p>
        </div>
        <div className="actions">
          {peut('appels:commenter') && !fiche.archive_le && (fiche.rappel_par_id === utilisateur.id ? (
            <button type="button" className="bouton bouton-secondaire" onClick={() => agir(() => api(`/appels/${id}/rappel`, 'DELETE'))}>
              Je ne rappelle plus
            </button>
          ) : (
            <button type="button" className="bouton" onClick={prendreRappel}>Je rappelle</button>
          ))}
          {modifiable && !fiche.archive_le && (
            <button type="button" className="bouton bouton-secondaire" onClick={() => setEdition(true)}>Modifier</button>
          )}
          {peut('appels:archiver') && (fiche.archive_le || fiche.statut_groupe === 'termine') && (
            <button type="button" className="bouton bouton-secondaire" onClick={() => agir(() => api(`/appels/${id}/${fiche.archive_le ? 'desarchiver' : 'archiver'}`, 'POST'))}>
              {fiche.archive_le ? 'Sortir des archives' : 'Archiver'}
            </button>
          )}
        </div>
      </div>

      {avertissement && <Alerte type="attention">{avertissement}</Alerte>}
      {fiche.consigne_confidentialite && (
        <Alerte type="attention"><strong>Consigne de confidentialité :</strong> {fiche.consigne_confidentialite}</Alerte>
      )}
      {fiche.rappel_par && (
        <Alerte type="info">{fiche.rappel_par} rappelle cette personne depuis {formaterDate(fiche.rappel_depuis)}.</Alerte>
      )}
      {fiche.archive_le && <Alerte type="info">Appel archivé le {formaterDate(fiche.archive_le)}.</Alerte>}

      <div className="fiche-grille">
        <section className="panneau">
          <h2>Informations</h2>
          <dl className="details">
            <dt>Motif</dt><dd>{fiche.categorie ?? '—'}</dd>
            <dt>Langue</dt><dd>{LANGUES[fiche.langue]}</dd>
            <dt>Boîte vocale</dt><dd>{fiche.boite_vocale ?? 'Appel répondu'}</dd>
            <dt>Reçu par</dt><dd>{fiche.recu_par ?? '—'}</dd>
            <dt>Dernière modification</dt><dd>{formaterDate(fiche.modifie_le)}{fiche.modifie_par && ` par ${fiche.modifie_par}`}</dd>
          </dl>
          <div className="grille-champs">
            <Champ etiquette="Statut">
              <select value={fiche.statut_id} disabled={!modifiable} onChange={(e) => changerChamp('statut_id', e.target.value)}>
                {statuts.filter((s) => s.actif || s.id === fiche.statut_id).map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select>
            </Champ>
            <Champ etiquette="Responsable du suivi">
              <select value={fiche.responsable_id ?? ''} disabled={!modifiable} onChange={(e) => changerChamp('responsable_id', e.target.value)}>
                <option value="">Non attribué</option>
                {employes.map((u) => <option key={u.id} value={u.id}>{u.nom_complet}</option>)}
              </select>
            </Champ>
          </div>
          <h3>Description</h3>
          <p className="texte-libre">{fiche.description ?? 'Aucune description.'}</p>
        </section>

        <section className="panneau">
          <h2>Actions de suivi</h2>
          {peut('appels:commenter') && (
            <form className="formulaire-compact" onSubmit={ajouterSuivi}>
              <Champ etiquette="Action">
                <select value={suivi.action} onChange={(e) => setSuivi({ ...suivi, action: e.target.value })}>
                  {Object.entries(ACTIONS_SUIVI).filter(([c]) => c !== 'rappel_en_cours').map(([code, libelle]) => (
                    <option key={code} value={code}>{libelle}</option>
                  ))}
                </select>
              </Champ>
              {suivi.action === 'rappel_prevu' && (
                <Champ etiquette="Rappeler vers">
                  <input type="datetime-local" value={suivi.prochain_rappel_le} onChange={(e) => setSuivi({ ...suivi, prochain_rappel_le: e.target.value })} />
                </Champ>
              )}
              <Champ etiquette="Détails (facultatif)" large>
                <input value={suivi.details} maxLength={500} onChange={(e) => setSuivi({ ...suivi, details: e.target.value })} placeholder="Ex. : message laissé à 10 h" />
              </Champ>
              <button type="submit" className="bouton">Ajouter l’action</button>
            </form>
          )}
          <ul className="chronologie">
            {fiche.suivis.map((s) => (
              <li key={s.id}>
                <strong>{ACTIONS_SUIVI[s.action] ?? s.action}</strong> — {s.auteur}
                {s.details && <p>{s.details}</p>}
                {s.prochain_rappel_le && <p>Rappeler vers {formaterDate(s.prochain_rappel_le)}</p>}
                <time className="discret">{formaterDate(s.cree_le)}</time>
              </li>
            ))}
            {!fiche.suivis.length && <li className="vide">Aucune action pour l’instant.</li>}
          </ul>
        </section>

        <section className="panneau">
          <h2>Notes et commentaires</h2>
          {peut('appels:commenter') && (
            <form className="formulaire-compact" onSubmit={ajouterNote}>
              <Champ etiquette="Type">
                <select value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })}>
                  <option value="commentaire">Commentaire</option>
                  <option value="note">Note</option>
                </select>
              </Champ>
              <Champ etiquette="Texte" large>
                <textarea value={note.contenu} rows={3} maxLength={5000} onChange={(e) => setNote({ ...note, contenu: e.target.value })} required />
              </Champ>
              <button type="submit" className="bouton" disabled={!note.contenu.trim()}>Ajouter</button>
            </form>
          )}
          <ul className="chronologie">
            {fiche.notes.map((n) => (
              <li key={n.id}>
                <strong>{n.auteur}</strong> <span className="discret">· {n.type === 'note' ? 'Note' : 'Commentaire'}</span>
                <p className="texte-libre">{n.contenu}</p>
                <time className="discret">{formaterDate(n.cree_le)}</time>
              </li>
            ))}
            {!fiche.notes.length && <li className="vide">Aucune note pour l’instant.</li>}
          </ul>
        </section>

        <section className="panneau">
          <h2>Historique des modifications</h2>
          <ul className="chronologie">
            {fiche.historique.map((h) => (
              <li key={h.id}>
                <strong>{h.champ}</strong>
                {h.ancienne_valeur ? ` : ${lisible(h.champ, h.ancienne_valeur)} → ${lisible(h.champ, h.nouvelle_valeur)}` : h.nouvelle_valeur ? ` : ${lisible(h.champ, h.nouvelle_valeur)}` : ''}
                <p className="discret">{h.auteur ?? 'Système'} · {formaterDate(h.cree_le)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {edition && (
        <FormulaireAppel
          appel={fiche}
          onFermer={() => {
            setEdition(false);
            charger(); // après un conflit, on affiche la version à jour
          }}
          onEnregistre={() => {
            setEdition(false);
            charger();
          }}
        />
      )}
    </>
  );
}
