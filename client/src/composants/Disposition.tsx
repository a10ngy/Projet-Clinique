import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexte/Authentification';
import { Lien, useRoute } from '../routeur';
import { useTempsReel } from '../temps-reel';
import { Avatar, Icone, type NomIcone } from './Icones';

interface EntreeMenu {
  vers: string;
  libelle: string;
  icone: NomIcone;
  permission?: string;
}

const MENU: { titre: string; liens: EntreeMenu[] }[] = [
  {
    titre: 'Suivi',
    liens: [
      { vers: '/', libelle: 'Tableau de bord', icone: 'accueil' },
      { vers: '/appels', libelle: 'Appels', icone: 'telephone' },
      { vers: '/mes-suivis', libelle: 'Mes suivis', icone: 'suivis' },
    ],
  },
  {
    titre: 'Administration',
    liens: [
      { vers: '/admin/employes', libelle: 'Employés', icone: 'equipe', permission: 'utilisateurs:gerer' },
      { vers: '/admin/parametres', libelle: 'Statuts et motifs', icone: 'reglages', permission: 'parametres:gerer' },
      { vers: '/admin/journal', libelle: 'Journal des accès', icone: 'journal', permission: 'journal:voir' },
    ],
  },
];

export function Marque({ clair }: { clair?: boolean }) {
  return (
    <div className={`marque ${clair ? 'marque-claire' : ''}`}>
      <span className="marque-symbole" aria-hidden="true">CF</span>
      <span className="marque-texte">
        <strong>Clinique des femmes</strong>
        <span>de l’Outaouais</span>
      </span>
    </div>
  );
}

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
          <Marque />
        </div>
        <nav aria-label="Navigation principale">
          {MENU.map((section) => {
            const liens = section.liens.filter((m) => !m.permission || peut(m.permission));
            if (!liens.length) return null;
            return (
              <div key={section.titre} className="menu-section">
                <span className="menu-section-titre">{section.titre}</span>
                {liens.map((m) => (
                  <Lien key={m.vers} vers={m.vers} className={`menu-lien ${actif(m.vers) ? 'menu-lien-actif' : ''}`}>
                    <Icone nom={m.icone} />
                    <span>{m.libelle}</span>
                  </Lien>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="menu-pied">
          <Avatar nom={utilisateur?.nom_complet} />
          <div className="menu-pied-identite">
            <strong>{utilisateur?.nom_complet}</strong>
            <span>{utilisateur?.role_libelle}</span>
          </div>
          <button type="button" className="bouton-icone bouton-icone-clair" onClick={deconnecter} aria-label="Se déconnecter" title="Se déconnecter">
            <Icone nom="sortie" />
          </button>
        </div>
      </aside>
      <div className={`voile ${menuOuvert ? 'voile-visible' : ''}`} onClick={() => setMenuOuvert(false)} aria-hidden="true" />

      <div className="contenu">
        <header className="entete">
          <button type="button" className="bouton-menu" onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Ouvrir le menu" aria-expanded={menuOuvert}>
            <Icone nom="menu" taille={22} />
          </button>
          <div className="entete-marque"><Marque clair /></div>
          <div className="entete-utilisateur">
            <span className="entete-identite">
              {utilisateur?.nom_complet} <small>{utilisateur?.role_libelle}</small>
            </span>
            <Avatar nom={utilisateur?.nom_complet} petit />
            <button type="button" className="bouton bouton-secondaire bouton-compact" onClick={deconnecter}>
              <Icone nom="sortie" taille={16} />
              <span className="masque-mobile">Se déconnecter</span>
            </button>
          </div>
        </header>
        {avis && (
          <div className="avis" role="status">
            <span className="avis-icone"><Icone nom="cloche" taille={16} /></span>
            <Lien vers="/mes-suivis">{avis}</Lien>
            <button type="button" className="bouton-icone" onClick={() => setAvis('')} aria-label="Fermer l'avis">
              <Icone nom="fermer" taille={16} />
            </button>
          </div>
        )}
        <main className="page" key={chemin}>{children}</main>
      </div>
    </div>
  );
}
