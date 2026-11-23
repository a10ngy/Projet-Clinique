import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { References } from '../api/types';
import { useTempsReel } from '../temps-reel';

const VIDE: References = { statuts: [], categories: [], boites: [], roles: [], employes: [] };
const Contexte = createContext<References & { recharger: () => void }>({ ...VIDE, recharger: () => {} });

// Statuts, motifs, boîtes vocales et employés : chargés une fois, rechargés si l'administration les modifie
export function ReferencesProvider({ children }: { children: ReactNode }) {
  const [references, setReferences] = useState<References>(VIDE);
  const recharger = () => {
    api<References>('/references').then(setReferences).catch(() => {});
  };

  useEffect(recharger, []);
  useTempsReel(['references:modifiees'], recharger);

  return <Contexte.Provider value={{ ...references, recharger }}>{children}</Contexte.Provider>;
}

export const useReferences = () => useContext(Contexte);
