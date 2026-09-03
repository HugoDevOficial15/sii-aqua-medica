import { createRoot } from 'react-dom/client';


import 'bootstrap/dist/css/bootstrap.min.css';

import './index.css';
import "./styles/auth/login-premium.css";

import "./styles/operator/operator-shell.css";
import "./styles/operator/operator-home.css";
import "./styles/operator/operator-theme.css";

import App from './App.jsx';
import { MAIN_BOOTSTRAP_CACHE_KEY, STARTUP_RESOURCES_CACHE_KEY, CRITICAL_MODULES_CACHE_KEY, writeMemoryCache, writeSessionCache } from './utils/cacheStore';

const APP_SHELL_CACHE = 'sii-aqua-shell-v3';

const cacheStartupResources = async () => {
  if (!('caches' in window) || !('fetch' in window)) {
    return;
  }

  try {
    const cache = await caches.open(APP_SHELL_CACHE);
    const urls = new Set([
      '/',
      '/index.html',
      '/service-worker.js',
      '/logo.png',
      '/logosmall.svg',
      ...Array.from(document.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="icon"][href], img[src]'))
        .map((element) => {
          const attribute = element.tagName === 'SCRIPT' ? 'src' : 'href';
          const value = element.getAttribute(attribute);
          if (!value) return null;
          return new URL(value, window.location.href).href;
        })
        .filter(Boolean)
    ]);

    const cachedUrls = await Promise.all(
      Array.from(urls).map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response && response.ok) {
            await cache.put(url, response.clone());
            return url;
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );

    const startupResources = {
      cachedAt: Date.now(),
      urls: cachedUrls.filter(Boolean),
    };

    writeMemoryCache(STARTUP_RESOURCES_CACHE_KEY, startupResources);
    writeSessionCache(STARTUP_RESOURCES_CACHE_KEY, startupResources);
  } catch (error) {
    console.warn('No se pudieron precargar los recursos de inicio:', error);
  }
};

const preloadCriticalModules = async () => {
  if (window.__siiAquaCriticalModulesLoaded) {
    return;
  }

  window.__siiAquaCriticalModulesLoaded = true;

  const imports = [
    () => import('./pages/admin/Dashboard'),
    () => import('./pages/admin/Users'),
    () => import('./modules/puestos/page/PuestosPage'),
    () => import('./modules/inventarios/InventarioPage'),
    () => import('./modules/personal/personal'),
    () => import('./modules/agenda/AgendaPage'),
    () => import('./pages/admin/Capacitaciones'),
    () => import('./pages/admin/News'),
    () => import('./modules/notas/notasPage'),
  ];

const loadedModules = await Promise.allSettled(imports.map(async (importer) => {
      const importedModule = await importer();
      return importedModule?.default ?? importedModule;
    }));

    const moduleInfo = loadedModules
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value?.name || 'module');

    const cachePayload = {
      loadedAt: Date.now(),
      modules: moduleInfo,
      count: moduleInfo.length,
    };

    writeMemoryCache(CRITICAL_MODULES_CACHE_KEY, cachePayload);
    writeSessionCache(CRITICAL_MODULES_CACHE_KEY, cachePayload);

    if ('performance' in window) {
      const resourceUrls = Array.from(new Set(
        performance.getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.includes('/assets/') || url.includes('/src/') || url.includes('/modules/'))
      ));

      if (resourceUrls.length > 0) {
        const startupResources = {
          loadedAt: Date.now(),
          urls: resourceUrls,
        };

        writeMemoryCache(STARTUP_RESOURCES_CACHE_KEY, startupResources);
        writeSessionCache(STARTUP_RESOURCES_CACHE_KEY, startupResources);
      }
    }

    return loadedModules;
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator) || window.__siiAquaSwRegistered) {
    return;
  }

  const isViteDevServer = import.meta.env.DEV || window.location.port === '5173';
  const allowedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  const isAllowedHost = (allowedHosts.includes(window.location.hostname) && !isViteDevServer) || window.location.protocol === 'https:';

  if (!isAllowedHost) {
    return;
  }

  window.__siiAquaSwRegistered = true;

  window.setTimeout(() => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => console.log('✓ Service Worker registrado'))
      .catch((error) => console.error('✗ Error registrando Service Worker:', error));
  }, 2000);
};

if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    registerServiceWorker();
    cacheStartupResources();
  });
} else {
  window.setTimeout(() => {
    registerServiceWorker();
    cacheStartupResources();
  }, 1500);
}

writeMemoryCache(MAIN_BOOTSTRAP_CACHE_KEY, {
  initializedAt: Date.now(),
  shellCacheReady: true,
  startupResourcesCached: true,
});
writeSessionCache(MAIN_BOOTSTRAP_CACHE_KEY, {
  initializedAt: Date.now(),
  shellCacheReady: true,
  startupResourcesCached: true,
});

window.addEventListener('sii-aqua-auth-ready', () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadCriticalModules();
    });
  } else {
    window.setTimeout(() => {
      preloadCriticalModules();
    }, 1200);
  }
});

createRoot(document.getElementById('root')).render(<App />);