import './App.css';
import { useEffect, useState } from 'react';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthProvider';
import { LoaderProvider } from './context/LoaderProvider';
import { PreferencesProvider } from './context/PreferencesProvider';

function App() {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }

    return false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Prevenir desplazamiento de la página cuando el teclado se abre en móviles
  useEffect(() => {
    const handleInputFocus = () => {
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
    };

    const handleInputBlur = () => {
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
    };

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      input.addEventListener('focus', handleInputFocus);
      input.addEventListener('blur', handleInputBlur);
    });

    const observer = new MutationObserver(() => {
      const newInputs = document.querySelectorAll('input, textarea, select');
      newInputs.forEach((input) => {
        if (!input.dataset.keyboardListenerAdded) {
          input.addEventListener('focus', handleInputFocus);
          input.addEventListener('blur', handleInputBlur);
          input.dataset.keyboardListenerAdded = 'true';
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      inputs.forEach((input) => {
        input.removeEventListener('focus', handleInputFocus);
        input.removeEventListener('blur', handleInputBlur);
      });
    };
  }, []);

  return (
    <>
      <PreferencesProvider>
        <AuthProvider>
          <LoaderProvider>
            <AppRouter />
          </LoaderProvider>
        </AuthProvider>
      </PreferencesProvider>

      {isOffline && (
        <div className="internet-saver" role="alert" aria-live="assertive">
          <div className="internet-saver__panel">
            <div className="internet-saver__icon" aria-hidden="true">
              <img
                            src="/logo.png"
                            alt="AQUA Médica"
                            className="offline-logo"
                        />
            </div>
            <h2>Sin conexión a internet</h2>
            <p>
              La aplicación quedó en modo sin conexión. Cuando la red regrese,
              se reactivará automáticamente.
            </p>
            <div className="internet-saver__signal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;