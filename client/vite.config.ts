import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, Vite transmet /api et /socket.io au serveur Express :
// le navigateur ne voit qu'une seule adresse, donc pas de CORS et le cookie de session suit.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/socket.io': { target: 'http://127.0.0.1:3001', ws: true },
    },
  },
});
