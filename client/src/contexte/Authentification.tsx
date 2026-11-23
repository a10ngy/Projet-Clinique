import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Utilisateur } from '../api/types';
import { deconnecterTempsReel } from '../temps-reel';

interface ContexteAuth {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  connecter: (courriel: string, motDePasse: string) => Promise<void>;
  deconnecter: () => Promise<void>;
  peut: (permission: string) => boolean;
}

const Contexte = createContext<ContexteAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Au démarrage : la session existe-t-elle déjà ?
    api<Utilisateur>('/auth/moi')
      .then(setUtilisateur)
      .catch(() => setUtilisateur(null))
      .finally(() => setChargement(false));
    const surExpiration = () => {
      deconnecterTempsReel();
      setUtilisateur(null);
    };
    window.addEventListener('session-expiree', surExpiration);
    return () => window.removeEventListener('session-expiree', surExpiration);
  }, []);

  const connecter = async (courriel: string, motDePasse: string) => {
    setUtilisateur(await api<Utilisateur>('/auth/connexion', 'POST', { courriel, mot_de_passe: motDePasse }));
  };

  const deconnecter = async () => {
    await api('/auth/deconnexion', 'POST').catch(() => {});
    deconnecterTempsReel();
    setUtilisateur(null);
  };

  const peut = (permission: string) => utilisateur?.permissions.includes(permission) ?? false;

  return (
    <Contexte.Provider value={{ utilisateur, chargement, connecter, deconnecter, peut }}>
      {children}
    </Contexte.Provider>
  );
}

export function useAuth() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return contexte;
}
