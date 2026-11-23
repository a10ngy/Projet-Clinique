import { useState, type FormEvent } from 'react';
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
      <form className="connexion-carte" onSubmit={soumettre}>
        <h1>Gestion des appels</h1>
        <p className="discret">Clinique des femmes de l’Outaouais · accès réservé à l’équipe</p>
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        <Champ etiquette="Courriel">
          <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} autoComplete="username" required autoFocus />
        </Champ>
        <Champ etiquette="Mot de passe">
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" required />
        </Champ>
        <button type="submit" className="bouton bouton-plein" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </main>
  );
}
