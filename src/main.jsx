import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import "./styles/operator/operator-shell.css";
import "./styles/operator/operator-home.css";
import "./styles/operator/operator-theme.css";

import "./styles/auth/login-premium.css";

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)