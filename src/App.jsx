import './App.css';
import { useEffect, useState } from 'react';
import AppRouter from './router/AppRouter';
import { useFirebaseMessaging } from './hooks/useFirebaseMessaging';
import { AuthProvider } from './context/AuthProvider';
import { LoaderProvider } from './context/LoaderProvider';
import { PreferencesProvider } from './context/PreferencesProvider';
import { APP_BOOTSTRAP_CACHE_KEY, readMemoryCache, writeMemoryCache } from './utils/cacheStore';

writeMemoryCache(APP_BOOTSTRAP_CACHE_KEY, {
  ...(readMemoryCache(APP_BOOTSTRAP_CACHE_KEY) ?? {}),
  appCssLoaded: true,
  shellInitialized: true,
});

function AppContent() {
  useFirebaseMessaging();

  return (
    <LoaderProvider>
      <AppRouter />
    </LoaderProvider>
  );
}

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
  // Usa delegación de eventos (focusin/focusout) en vez de MutationObserver +
  // querySelectorAll en cada mutación del DOM, que causaba bloqueos severos
  // en pantallas con muchos elementos (evaluaciones, listas, etc).
  useEffect(() => {
    const isFormField = (target) =>
      target instanceof Element && target.matches('input, textarea, select');

    const handleFocusIn = (event) => {
      if (!isFormField(event.target)) return;
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
    };

    const handleFocusOut = (event) => {
      if (!isFormField(event.target)) return;
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <>
      <PreferencesProvider>
        <AuthProvider>
          <AppContent />
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