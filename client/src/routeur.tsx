import { createContext, useContext, useEffect, useState, type MouseEvent, type ReactNode } from 'react';

// Petit routeur maison (aucune dépendance) : suffisant pour une dizaine de pages
interface Route {
  chemin: string;
  recherche: string;
  naviguer: (url: string, remplacer?: boolean) => void;
}

const ContexteRoute = createContext<Route>({ chemin: '/', recherche: '', naviguer: () => {} });
const lire = () => ({ chemin: window.location.pathname, recherche: window.location.search });

export function Routeur({ children }: { children: ReactNode }) {
  const [emplacement, setEmplacement] = useState(lire);

  useEffect(() => {
    const surRetour = () => setEmplacement(lire()); // boutons Précédent / Suivant du navigateur
    window.addEventListener('popstate', surRetour);
    return () => window.removeEventListener('popstate', surRetour);
  }, []);

  const naviguer = (url: string, remplacer = false) => {
    window.history[remplacer ? 'replaceState' : 'pushState'](null, '', url);
    setEmplacement(lire());
  };

  return <ContexteRoute.Provider value={{ ...emplacement, naviguer }}>{children}</ContexteRoute.Provider>;
}

export const useRoute = () => useContext(ContexteRoute);

// Lien interne : change de page sans recharger, mais Ctrl+clic ouvre toujours un nouvel onglet
export function Lien({ vers, className, children }: { vers: string; className?: string; children: ReactNode }) {
  const { naviguer } = useRoute();
  const clic = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    naviguer(vers);
  };
  return <a href={vers} className={className} onClick={clic}>{children}</a>;
}

// '/appels/:id' et '/appels/12' -> { id: '12' } ; null si le chemin ne correspond pas
export function correspond(modele: string, chemin: string): Record<string, string> | null {
  const a = modele.split('/');
  const b = chemin.replace(/\/$/, '').split('/');
  if (modele === '/' && chemin === '/') return {};
  if (a.length !== b.length) return null;
  const parametres: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) parametres[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return parametres;
}
