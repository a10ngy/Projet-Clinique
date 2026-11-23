import { useState, type FormEvent } from 'react';
import { api, ErreurApi } from '../api/client';
import type { Appel } from '../api/types';
import { useAuth } from '../contexte/Authentification';
import { useReferences } from '../contexte/References';
import { chiffres, formaterTelephone, LANGUES, versChampLocal, versIso } from '../utils/format';
import { Alerte, Champ, Modale } from './Interface';

interface Props {
  appel?: Appel; // absent = nouvel appel
  onEnregistre: (appel: Appel) => void;
  onFermer: () => void;
}

const nombreOuNull = (valeur: string) => (valeur ? Number(valeur) : null);
const texte = (valeur: number | string | null | undefined) => (valeur == null ? '' : String(valeur));

export function FormulaireAppel({ appel, onEnregistre, onFermer }: Props) {
  const { utilisateur } = useAuth();
  const { statuts, categories, boites, employes } = useReferences();
  const premierStatut = statuts.find((s) => s.actif)?.id;

  const [champs, setChamps] = useState({
    nom_appelant: texte(appel?.nom_appelant),
    telephone: formaterTelephone(appel?.telephone),
    recu_le: versChampLocal(appel?.recu_le),
    langue: appel?.langue ?? 'fr',
    categorie_id: texte(appel?.categorie_id),
    boite_vocale_id: texte(appel?.boite_vocale_id),
    recu_par_id: texte(appel ? appel.recu_par_id : utilisateur?.id),
    responsable_id: texte(appel?.responsable_id),
    statut_id: texte(appel?.statut_id ?? premierStatut),
    description: texte(appel?.description),
    consigne_confidentialite: texte(appel?.consigne_confidentialite),
  });
  const [dateInitiale] = useState(champs.recu_le);
  // La version lue à l'ouverture : si quelqu'un modifie l'appel entre-temps, le serveur refusera (409)
  const [versionLue] = useState(appel?.version);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [conflit, setConflit] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const modifier = (cle: keyof typeof champs) => (e: { target: { value: string } }) =>
    setChamps({ ...champs, [cle]: e.target.value });

  // Vérifications rapides avant l'envoi ; le serveur revérifie tout de toute façon
  function verifier() {
    const trouvees: Record<string, string> = {};
    const n = chiffres(champs.telephone);
    if (!(n.length === 10 || (n.length === 11 && n.startsWith('1')))) trouvees.telephone = 'Numéro invalide : 10 chiffres requis';
    if (!champs.recu_le) trouvees.recu_le = 'Date et heure requises';
    else if (new Date(champs.recu_le).getTime() > Date.now() + 5 * 60_000) trouvees.recu_le = 'La date ne peut pas être dans le futur';
    if (!champs.statut_id) trouvees.statut_id = 'Statut requis';
    return trouvees;
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const trouvees = verifier();
    setErreurs(trouvees);
    if (Object.keys(trouvees).length) return;

    const corps = {
      nom_appelant: champs.nom_appelant || null,
      telephone: champs.telephone,
      recu_le: versIso(champs.recu_le),
      langue: champs.langue,
      categorie_id: nombreOuNull(champs.categorie_id),
      boite_vocale_id: nombreOuNull(champs.boite_vocale_id),
      recu_par_id: nombreOuNull(champs.recu_par_id),
      responsable_id: nombreOuNull(champs.responsable_id),
      statut_id: Number(champs.statut_id),
      description: champs.description || null,
      consigne_confidentialite: champs.consigne_confidentialite || null,
    };
    setEnvoi(true);
    setMessage('');
    try {
      // En modification, la date n'est renvoyée que si elle a changé (le champ ignore les secondes)
      const modification = champs.recu_le === dateInitiale ? { ...corps, recu_le: undefined } : corps;
      const resultat = appel
        ? await api<Appel>(`/appels/${appel.id}`, 'PATCH', { ...modification, version: versionLue })
        : await api<Appel>('/appels', 'POST', corps);
      onEnregistre(resultat);
    } catch (err) {
      const erreur = err as ErreurApi;
      setErreurs(erreur.champs ?? {});
      setMessage(erreur.message);
      setConflit(erreur.statut === 409);
    } finally {
      setEnvoi(false);
    }
  }

  const actifs = <T extends { actif: number }>(liste: T[]) => liste.filter((x) => x.actif);

  return (
    <Modale titre={appel ? 'Modifier l’appel' : 'Nouvel appel'} onFermer={onFermer}>
      <form className="formulaire" onSubmit={enregistrer} noValidate>
        {message && (
          <Alerte type="erreur">
            {message}{' '}
            {conflit && <button type="button" className="bouton bouton-secondaire" onClick={onFermer}>Voir la version à jour</button>}
          </Alerte>
        )}
        <div className="grille-champs">
          <Champ etiquette="Nom de la personne" erreur={erreurs.nom_appelant}>
            <input value={champs.nom_appelant} onChange={modifier('nom_appelant')} maxLength={120} autoComplete="off" />
          </Champ>
          <Champ etiquette="Téléphone *" erreur={erreurs.telephone}>
            <input value={champs.telephone} onChange={modifier('telephone')} inputMode="tel" placeholder="819 555-0142" required />
          </Champ>
          <Champ etiquette="Date et heure de l’appel *" erreur={erreurs.recu_le}>
            <input type="datetime-local" value={champs.recu_le} onChange={modifier('recu_le')} required />
          </Champ>
          <Champ etiquette="Langue parlée" erreur={erreurs.langue}>
            <select value={champs.langue} onChange={modifier('langue')}>
              {Object.entries(LANGUES).map(([code, libelle]) => <option key={code} value={code}>{libelle}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Motif de l’appel" erreur={erreurs.categorie_id}>
            <select value={champs.categorie_id} onChange={modifier('categorie_id')}>
              <option value="">— Non précisé —</option>
              {actifs(categories).map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Boîte vocale" erreur={erreurs.boite_vocale_id}>
            <select value={champs.boite_vocale_id} onChange={modifier('boite_vocale_id')}>
              <option value="">Appel répondu (aucune boîte)</option>
              {actifs(boites).map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Reçu par" erreur={erreurs.recu_par_id}>
            <select value={champs.recu_par_id} onChange={modifier('recu_par_id')}>
              <option value="">—</option>
              {employes.map((u) => <option key={u.id} value={u.id}>{u.nom_complet}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Responsable du suivi" erreur={erreurs.responsable_id}>
            <select value={champs.responsable_id} onChange={modifier('responsable_id')}>
              <option value="">Non attribué</option>
              {employes.map((u) => <option key={u.id} value={u.id}>{u.nom_complet}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Statut *" erreur={erreurs.statut_id}>
            <select value={champs.statut_id} onChange={modifier('statut_id')} required>
              {actifs(statuts).map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
          </Champ>
          <Champ etiquette="Consigne de confidentialité" erreur={erreurs.consigne_confidentialite}>
            <input value={champs.consigne_confidentialite} onChange={modifier('consigne_confidentialite')} maxLength={255} placeholder="Ex. : ne pas laisser de message" />
          </Champ>
          <Champ etiquette="Description ou notes" erreur={erreurs.description} large>
            <textarea value={champs.description} onChange={modifier('description')} rows={4} maxLength={5000} />
          </Champ>
        </div>
        <footer className="modale-actions">
          <button type="button" className="bouton bouton-secondaire" onClick={onFermer}>Annuler</button>
          <button type="submit" className="bouton" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </footer>
      </form>
    </Modale>
  );
}
