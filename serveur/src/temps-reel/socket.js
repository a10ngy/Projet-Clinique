import { Server } from 'socket.io';
import { sessionMiddleware } from '../config/session.js';

let io = null;

// Socket.IO utilise la même session que l'API : une personne non connectée ne reçoit rien
export function initialiserTempsReel(serveurHttp) {
  io = new Server(serveurHttp);
  io.engine.use(sessionMiddleware);
  io.use((socket, suivant) => {
    const id = socket.request.session?.utilisateurId;
    return id ? suivant() : suivant(new Error('Non connecté'));
  });
  io.on('connection', (socket) => {
    socket.join(`utilisateur:${socket.request.session.utilisateurId}`); // canal personnel
  });
}

// Les événements ne contiennent que des identifiants : chaque écran recharge ce dont il a besoin
export function diffuser(evenement, donnees = {}) {
  io?.emit(evenement, donnees);
}

export function notifierUtilisateur(utilisateurId, evenement, donnees = {}) {
  io?.to(`utilisateur:${utilisateurId}`).emit(evenement, donnees);
}

export function deconnecterUtilisateur(utilisateurId) {
  io?.in(`utilisateur:${utilisateurId}`).disconnectSockets(true);
}
