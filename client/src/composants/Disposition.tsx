import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexte/Authentification';
import { Lien, useRoute } from '../routeur';
import { useTempsReel } from '../temps-reel';

const MENU = [
  { vers: '/', libelle: 'Tableau de bord' },
  { vers: '/appels', libelle: 'Appels' },
  { vers: '/mes-suivis', libelle: 'Mes suivis' },
  { vers: '/admin/employes', libelle: 'Employés', permission: 'utilisateurs:gerer' },
  { vers: '/admin/parametres', libelle: 'Statuts et motifs', permission: 'parametres:gerer' },
  { vers: '/admin/journal', libelle: 'Journal des accès', permission: 'journal:voir' },
];

// Menu latéral + en-tête, autour de chaque page
export function Disposition({ children }: { children: ReactNode }) {
  const { utilisateur, deconnecter, peut } = useAuth();
  const { chemin } = useRoute();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [avis, setAvis] = useState('');

  useTempsReel(['suivi:attribue'], () => setAvis('Un appel vient de vous être attribué. Voir « Mes suivis ».'));

  const actif = (vers: string) => (vers === '/' ? chemin === '/' : chemin.startsWith(vers));

  return (
    <div className="application">
      <aside className={`menu ${menuOuvert ? 'menu-ouvert' : ''}`} onClick={() => setMenuOuvert(false)}>
        <div className="menu-titre">
          <strong>Clinique des femmes</strong>
          <span>Gestion des appels</span>
        </div>
        <nav aria-label="Navigation principale">
          {MENU.filter((m) => !m.permission || peut(m.permission)).map((m) => (
            <Lien key={m.vers} vers={m.vers} className={`menu-lien ${actif(m.vers) ? 'menu-lien-actif' : ''}`}>
              {m.libelle}
            </Lien>
          ))}
        </nav>
      </aside>

      <div className="contenu">
        <header className="entete">
          <button type="button" className="bouton-menu" onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Ouvrir le menu">
            ☰
          </button>
          <div className="entete-utilisateur">
            <span>
              {utilisateur?.nom_complet} <small>· {utilisateur?.role_libelle}</small>
            </span>
            <button type="button" className="bouton bouton-secondaire" onClick={deconnecter}>Se déconnecter</button>
          </div>
        </header>
        {avis && (
          <div className="avis" role="status">
            <Lien vers="/mes-suivis">{avis}</Lien>
            <button type="button" className="bouton-icone" onClick={() => setAvis('')} aria-label="Fermer l'avis">×</button>
          </div>
        )}
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
