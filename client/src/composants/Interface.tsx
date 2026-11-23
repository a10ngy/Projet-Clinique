import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

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
        <button type="button" className="bouton-icone" onClick={onFermer} aria-label="Fermer">×</button>
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

export function Alerte({ type = 'info', children }: { type?: 'info' | 'erreur' | 'succes' | 'attention'; children: ReactNode }) {
  return <div className={`alerte alerte-${type}`} role={type === 'erreur' ? 'alert' : 'status'}>{children}</div>;
}
