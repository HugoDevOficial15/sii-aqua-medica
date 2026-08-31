import './App.css';
import { useEffect, useState } from 'react';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthProvider';
import { LoaderProvider } from './context/LoaderProvider';
import { PreferencesProvider } from './context/PreferencesProvider';
import { APP_BOOTSTRAP_CACHE_KEY, readMemoryCache, writeMemoryCache } from './utils/cacheStore';

writeMemoryCache(APP_BOOTSTRAP_CACHE_KEY, {
  ...(readMemoryCache(APP_BOOTSTRAP_CACHE_KEY) ?? {}),
  appCssLoaded: true,
  shellInitialized: true,
});

function App() {
  const [isOffline, setIsOffline] = useState(() => {
    const cachedState = readMemoryCache(APP_BOOTSTRAP_CACHE_KEY) ?? {};

    if (typeof cachedState.isOffline === 'boolean') {
      return cachedState.isOffline;
    }

    const initialOfflineState = typeof navigator !== 'undefined' ? !navigator.onLine : false;

    writeMemoryCache(APP_BOOTSTRAP_CACHE_KEY, {
      ...cachedState,
      isOffline: initialOfflineState,
      cssLoaded: true,
    });

    return initialOfflineState;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      writeMemoryCache(APP_BOOTSTRAP_CACHE_KEY, {
        ...(readMemoryCache(APP_BOOTSTRAP_CACHE_KEY) ?? {}),
        isOffline: false,
        cssLoaded: true,
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      writeMemoryCache(APP_BOOTSTRAP_CACHE_KEY, {
        ...(readMemoryCache(APP_BOOTSTRAP_CACHE_KEY) ?? {}),
        isOffline: true,
        cssLoaded: true,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    writeMemoryCache(APP_BOOTSTRAP_CACHE_KEY, {
      ...(readMemoryCache(APP_BOOTSTRAP_CACHE_KEY) ?? {}),
      isOffline,
      cssLoaded: true,
    });
  }, [isOffline]);

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