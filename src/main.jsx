import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import "./styles/operator/operator-shell.css";
import "./styles/operator/operator-home.css";
import "./styles/operator/operator-theme.css";

import "./styles/auth/login-premium.css";

import App from './App.jsx';
import maskFirebaseKeys from './utils/maskFirebaseKeys.js';

// Enmascarar keys sensibles de Firebase en consola
// Desactivado temporalmente para evitar loops infinitos en development
// Descomenta la siguiente línea si necesitas ocultar keys en consola:
// maskFirebaseKeys();

// Registrar Service Worker para notificaciones push offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => console.log('✓ Service Worker registrado'))
    .catch(error => console.error('✗ Error registrando Service Worker:', error));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)