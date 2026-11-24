import { useEffect, useState, type FormEvent } from 'react';
import { api, ErreurApi } from '../../api/client';
import type { Employe, Role } from '../../api/types';
import { Icone } from '../../composants/Icones';
import { Alerte, Champ, EntetePage, Modale } from '../../composants/Interface';
import { useAuth } from '../../contexte/Authentification';
import { useReferences } from '../../contexte/References';
import { Lien } from '../../routeur';
import { formaterDate } from '../../utils/format';

export function Employes() {
  const { utilisateur } = useAuth();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [message, setMessage] = useState('');
  const [enEdition, setEnEdition] = useState<Employe | 'nouveau' | null>(null);

  const charger = () => api<Employe[]>('/utilisateurs').then(setEmployes).catch((e: Error) => setMessage(e.message));
  useEffect(() => {
    charger();
  }, []);

  async function basculerActif(e: Employe) {
    if (e.actif && !window.confirm(`Désactiver le compte de ${e.nom_complet} ? La personne sera déconnectée immédiatement.`)) return;
    try {
      await api(`/utilisateurs/${e.id}`, 'PATCH', { actif: !e.actif });
      charger();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <>
      <EntetePage surtitre="Administration" titre="Employés" description="Comptes de l’équipe, rôles et accès à l’application.">
        <button type="button" className="bouton" onClick={() => setEnEdition('nouveau')}><Icone nom="plus" taille={18} /> Ajouter un employé</button>
      </EntetePage>
      {message && <Alerte type="erreur">{message}</Alerte>}
      <div className="tableau-conteneur">
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Nom</th><th scope="col">Courriel</th><th scope="col">Rôle</th>
              <th scope="col">Suivis ouverts</th><th scope="col">Dernière connexion</th><th scope="col">Compte</th><th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employes.map((e) => (
              <tr key={e.id} className={e.actif ? '' : 'ligne-inactive'}>
                <td data-etiquette="Nom">{e.nom_complet}</td>
                <td data-etiquette="Courriel">{e.courriel}</td>
                <td data-etiquette="Rôle">{e.role_libelle}</td>
                <td data-etiquette="Suivis ouverts"><Lien vers={`/appels?responsable=${e.id}`}>{e.suivis_ouverts} — voir ses appels</Lien></td>
                <td data-etiquette="Dernière connexion">{formaterDate(e.derniere_connexion)}</td>
                <td data-etiquette="Compte"><span className={`etat ${e.actif ? 'etat-actif' : ''}`}>{e.actif ? 'Actif' : 'Désactivé'}</span></td>
                <td data-etiquette="Actions">
                  <div className="cellule-actions">
                    <button type="button" className="bouton bouton-secondaire" onClick={() => setEnEdition(e)}>Modifier</button>
                    {e.id !== utilisateur?.id && (
                      <button type="button" className="bouton bouton-secondaire" onClick={() => basculerActif(e)}>
                        {e.actif ? 'Désactiver' : 'Réactiver'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {enEdition && (
        <FormulaireEmploye
          employe={enEdition === 'nouveau' ? undefined : enEdition}
          onFermer={() => setEnEdition(null)}
          onEnregistre={() => {
            setEnEdition(null);
            charger();
          }}
        />
      )}
    </>
  );
}

function FormulaireEmploye({ employe, onFermer, onEnregistre }: { employe?: Employe; onFermer: () => void; onEnregistre: () => void }) {
  const { roles } = useReferences();
  const [champs, setChamps] = useState({
    nom_complet: employe?.nom_complet ?? '',
    courriel: employe?.courriel ?? '',
    role: employe?.role ?? ('equipe' as Role),
    mot_de_passe: '',
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    // En modification, un mot de passe vide signifie « ne pas le changer »
    const corps = employe && !champs.mot_de_passe ? { ...champs, mot_de_passe: undefined } : champs;
    try {
      await (employe ? api(`/utilisateurs/${employe.id}`, 'PATCH', corps) : api('/utilisateurs', 'POST', corps));
      onEnregistre();
    } catch (err) {
      setErreurs((err as ErreurApi).champs ?? {});
      setMessage((err as Error).message);
    }
  }

  return (
    <Modale titre={employe ? 'Modifier un employé' : 'Ajouter un employé'} onFermer={onFermer}>
      <form className="formulaire" onSubmit={enregistrer}>
        {message && <Alerte type="erreur">{message}</Alerte>}
        <div className="grille-champs">
          <Champ etiquette="Nom complet *" erreur={erreurs.nom_complet}>
            <input value={champs.nom_complet} onChange={(e) => setChamps({ ...champs, nom_complet: e.target.value })} required />
          </Champ>
          <Champ etiquette="Courriel *" erreur={erreurs.courriel}>
            <input type="email" value={champs.courriel} onChange={(e) => setChamps({ ...champs, courriel: e.target.value })} required />
          </Champ>
          <Champ etiquette="Rôle *" erreur={erreurs.role}>
            <select value={champs.role} onChange={(e) => setChamps({ ...champs, role: e.target.value as Role })}>
              {roles.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}
            </select>
          </Champ>
          <Champ etiquette={employe ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe temporaire *'} erreur={erreurs.mot_de_passe}>
            <input type="password" value={champs.mot_de_passe} minLength={10} autoComplete="new-password" onChange={(e) => setChamps({ ...champs, mot_de_passe: e.target.value })} required={!employe} />
          </Champ>
        </div>
        <footer className="modale-actions">
          <button type="button" className="bouton bouton-secondaire" onClick={onFermer}>Annuler</button>
          <button type="submit" className="bouton">Enregistrer</button>
        </footer>
      </form>
    </Modale>
  );
}
