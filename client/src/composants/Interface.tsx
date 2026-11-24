import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Icone, type NomIcone } from './Icones';

// Petits composants réutilisés partout

export function BadgeStatut({ libelle, couleur }: { libelle: string; couleur: string }) {
  return <span className="badge" style={{ '--couleur': couleur } as CSSProperties}>{libelle}</span>;
}

// Fenêtre modale native (<dialog>) : Échap la ferme et le focus reste à l'intérieur
export function Modale({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modale" onClose={onFermer} aria-labelledby="titre-modale">
      <header className="modale-entete">
        <h2 id="titre-modale">{titre}</h2>
        <button type="button" className="bouton-icone" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" taille={20} /></button>
      </header>
      {children}
    </dialog>
  );
}

// Étiquette + champ + message d'erreur
export function Champ({ etiquette, erreur, large, children }: { etiquette: string; erreur?: string; large?: boolean; children: ReactNode }) {
  return (
    <label className={`champ ${large ? 'champ-large' : ''}`}>
      <span className="champ-etiquette">{etiquette}</span>
      {children}
      {erreur && <span className="champ-erreur" role="alert">{erreur}</span>}
    </label>
  );
}

const ICONES_ALERTE: Record<string, NomIcone> = { info: 'info', erreur: 'alerte', succes: 'coche', attention: 'alerte' };

export function Alerte({ type = 'info', children }: { type?: 'info' | 'erreur' | 'succes' | 'attention'; children: ReactNode }) {
  return (
    <div className={`alerte alerte-${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
      <Icone nom={ICONES_ALERTE[type]} taille={18} />
      <div className="alerte-texte">{children}</div>
    </div>
  );
}

// En-tête de page : petit surtitre, grand titre, description et actions à droite
export function EntetePage({ surtitre, titre, description, children }: { surtitre?: string; titre: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="titre-page">
      <div className="titre-page-texte">
        {surtitre && <span className="surtitre">{surtitre}</span>}
        <h1>{titre}</h1>
        {description && <p className="sous-titre">{description}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export function EtatVide({ icone = 'boite', children }: { icone?: NomIcone; children: ReactNode }) {
  return (
    <div className="vide">
      <span className="vide-icone"><Icone nom={icone} taille={22} /></span>
      <p>{children}</p>
    </div>
  );
}
