import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Une seule connexion Socket.IO par onglet, ouverte une fois la personne connectée
function obtenirSocket() {
  socket ??= io();
  return socket;
}

export function deconnecterTempsReel() {
  socket?.disconnect();
  socket = null;
}

// Exécute « action » chaque fois que l'un des événements arrive (ex. : recharger la liste)
export function useTempsReel(evenements: string[], action: (donnees: { id?: number }) => void) {
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  });

  const cle = evenements.join('|');
  useEffect(() => {
    const s = obtenirSocket();
    const surEvenement = (donnees: { id?: number }) => actionRef.current(donnees ?? {});
    for (const evenement of cle.split('|')) s.on(evenement, surEvenement);
    return () => {
      for (const evenement of cle.split('|')) s.off(evenement, surEvenement);
    };
  }, [cle]);
}
