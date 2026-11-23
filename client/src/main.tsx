import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexte/Authentification';
import { Routeur } from './routeur';
import './styles/global.css';

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <Routeur>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Routeur>
  </StrictMode>,
);
