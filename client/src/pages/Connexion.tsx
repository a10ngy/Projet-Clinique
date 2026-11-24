import { useState, type FormEvent } from 'react';
import { Marque } from '../composants/Disposition';
import { Icone } from '../composants/Icones';
import { Alerte, Champ } from '../composants/Interface';
import { useAuth } from '../contexte/Authentification';

export function Connexion() {
  const { connecter } = useAuth();
  const [courriel, setCourriel] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await connecter(courriel, motDePasse);
    } catch (err) {
      setErreur((err as Error).message);
      setMotDePasse('');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="connexion">
      <section className="connexion-vitrine" aria-hidden="true">
        <Marque />
        <div className="connexion-vitrine-texte">
          <span className="surtitre surtitre-clair">Espace de l’équipe</span>
          <p className="connexion-accroche">Chaque appel compte.<br /><em>Chaque suivi aussi.</em></p>
          <p className="connexion-description">Centralisez les appels et les messages vocaux, attribuez les suivis et travaillez en temps réel, en toute confidentialité.</p>
        </div>
        <ul className="connexion-atouts">
          <li><Icone nom="telephone" taille={16} /> Appels et boîtes vocales réunis</li>
          <li><Icone nom="activite" taille={16} /> Collaboration en temps réel</li>
          <li><Icone nom="bouclier" taille={16} /> Accès sécurisé et journalisé</li>
        </ul>
      </section>

      <section className="connexion-zone">
        <form className="connexion-carte" onSubmit={soumettre}>
          <div className="connexion-marque-mobile"><Marque clair /></div>
          <div>
            <h1>Gestion des appels</h1>
            <p className="discret">Clinique des femmes de l’Outaouais · accès réservé à l’équipe</p>
          </div>
          {erreur && <Alerte type="erreur">{erreur}</Alerte>}
          <Champ etiquette="Courriel">
            <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} autoComplete="username" placeholder="prenom@clinique.test" required autoFocus />
          </Champ>
          <Champ etiquette="Mot de passe">
            <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" placeholder="••••••••••" required />
          </Champ>
          <button type="submit" className="bouton bouton-plein bouton-grand" disabled={envoi}>
            {envoi ? <><span className="spinner spinner-clair" /> Connexion…</> : <>Se connecter <Icone nom="droite" taille={16} /></>}
          </button>
          <p className="connexion-note"><Icone nom="bouclier" taille={14} /> Accès réservé · connexions journalisées</p>
        </form>
      </section>
    </main>
  );
}
