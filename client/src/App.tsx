import type { ReactNode } from 'react';
import { Disposition } from './composants/Disposition';
import { Alerte } from './composants/Interface';
import { useAuth } from './contexte/Authentification';
import { ReferencesProvider } from './contexte/References';
import { Appels } from './pages/Appels';
import { Connexion } from './pages/Connexion';
import { FicheAppel } from './pages/FicheAppel';
import { TableauDeBord } from './pages/TableauDeBord';
import { Employes } from './pages/admin/Employes';
import { Journal } from './pages/admin/Journal';
import { Parametres } from './pages/admin/Parametres';
import { correspond, useRoute } from './routeur';

interface Page {
  chemin: string;
  afficher: (parametres: Record<string, string>) => ReactNode;
  permission?: string;
}

const PAGES: Page[] = [
  { chemin: '/', afficher: () => <TableauDeBord /> },
  { chemin: '/appels', afficher: () => <Appels /> },
  { chemin: '/appels/:id', afficher: (p) => <FicheAppel key={p.id} id={Number(p.id)} /> },
  { chemin: '/mes-suivis', afficher: () => <Appels key="mes-suivis" mesSuivis /> },
  { chemin: '/admin/employes', afficher: () => <Employes />, permission: 'utilisateurs:gerer' },
  { chemin: '/admin/parametres', afficher: () => <Parametres />, permission: 'parametres:gerer' },
  { chemin: '/admin/journal', afficher: () => <Journal />, permission: 'journal:voir' },
];

export default function App() {
  const { utilisateur, chargement, peut } = useAuth();
  const { chemin } = useRoute();

  if (chargement) return <div className="chargement-page" role="status"><span className="spinner" />Chargement…</div>;
  if (!utilisateur) return <Connexion />; // non connecté : toujours l'écran de connexion

  let contenu: ReactNode = <Alerte type="info">Cette page n’existe pas.</Alerte>;
  for (const page of PAGES) {
    const parametres = correspond(page.chemin, chemin);
    if (!parametres) continue;
    contenu = !page.permission || peut(page.permission)
      ? page.afficher(parametres)
      : <Alerte type="erreur">Vous n’avez pas accès à cette page.</Alerte>;
    break;
  }

  return (
    <ReferencesProvider>
      <Disposition>{contenu}</Disposition>
    </ReferencesProvider>
  );
}
