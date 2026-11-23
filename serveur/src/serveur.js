import { createServer } from 'node:http';
import { creerApp } from './app.js';
import { initialiserTempsReel } from './temps-reel/socket.js';

// Un seul serveur HTTP pour l'API REST et pour Socket.IO
const serveurHttp = createServer(creerApp());
initialiserTempsReel(serveurHttp);

const hote = process.env.HOTE || '127.0.0.1';
const port = Number(process.env.PORT || 3001);
serveurHttp.listen(port, hote, () => console.log(`API prête : http://${hote}:${port}/api/sante`));
