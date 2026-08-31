const DEFAULT_TTL_MS = 20 * 60 * 1000;
const SESSION_CACHE_PREFIX = "session-cache:";
const MEMORY_CACHE = new Map();

export const readMemoryCache = (key) => {
  if (!key) return null;
  return MEMORY_CACHE.get(key) ?? null;
};

export const writeMemoryCache = (key, data) => {
  if (!key) return;
  MEMORY_CACHE.set(key, data);
};

export const clearMemoryCache = (key) => {
  if (!key) return;
  MEMORY_CACHE.delete(key);
};

export const clearMemoryCaches = () => {
  MEMORY_CACHE.clear();
};

export const readCachedData = (key, ttlMs = DEFAULT_TTL_MS) => {
  if (typeof window === "undefined") return null;

  const memoryData = readMemoryCache(key);
  if (memoryData !== undefined && memoryData !== null) {
    return memoryData;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const age = Date.now() - Number(parsed.cachedAt || 0);
    if (age > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }

    const data = parsed.data ?? null;
    if (data !== null) {
      writeMemoryCache(key, data);
    }
    return data;
  } catch (error) {
    return null;
  }
};

export const writeCachedData = (key, data) => {
  if (typeof window === "undefined") return;

  writeMemoryCache(key, data);

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        cachedAt: Date.now(),
        data,
      })
    );
  } catch (error) {
    // no-op: storage may be unavailable
  }
};

export const writeSessionCache = (key, data) => {
  if (typeof window === "undefined") return;

  writeMemoryCache(key, data);

  try {
    const sessionKey = `${SESSION_CACHE_PREFIX}${key}`;
    localStorage.setItem(
      sessionKey,
      JSON.stringify({
        cachedAt: Date.now(),
        data,
      })
    );
  } catch (error) {
    // no-op
  }
};

export const readSessionCache = (key) => {
  if (typeof window === "undefined") return null;

  const memoryData = readMemoryCache(key);
  if (memoryData !== undefined && memoryData !== null) {
    return memoryData;
  }

  try {
    const sessionKey = `${SESSION_CACHE_PREFIX}${key}`;
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const data = parsed.data ?? null;
    if (data !== null) {
      writeMemoryCache(key, data);
    }
    return data;
  } catch (error) {
    return null;
  }
};

export const clearCachedData = (key) => {
  if (typeof window === "undefined") return;

  clearMemoryCache(key);

  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${SESSION_CACHE_PREFIX}${key}`);
  } catch (error) {
    // no-op
  }
};

export const clearCachedByPrefix = (prefix) => {
  if (typeof window === "undefined") return;

  for (const existingKey of Array.from(MEMORY_CACHE.keys())) {
    if (existingKey.startsWith(prefix)) {
      MEMORY_CACHE.delete(existingKey);
    }
  }

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix) || key.startsWith(`${SESSION_CACHE_PREFIX}${prefix}`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    // no-op
  }
};

export const clearSessionCaches = () => {
  clearMemoryCaches();

  if (typeof window === "undefined") return;

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(SESSION_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    // no-op
  }
};

export const invalidateCacheGroup = (...prefixes) => {
  const safePrefixes = (prefixes || []).filter(Boolean);
  if (!safePrefixes.length) {
    return;
  }

  safePrefixes.forEach((prefix) => {
    clearCachedByPrefix(prefix);
  });
};

export const CACHE_TTL_MS = DEFAULT_TTL_MS;

export const APP_BOOTSTRAP_CACHE_KEY = "app-bootstrap-shell";
export const THEME_CACHE_KEY = "theme";
export const FONT_SIZE_CACHE_KEY = "fontSize";
export const SIDEBAR_MENU_CACHE_KEY = "sidebar-menu";
export const LOADER_CACHE_KEY = "app-loader-shell";
export const MAIN_BOOTSTRAP_CACHE_KEY = "main-bootstrap-shell";
export const FIREBASE_BOOTSTRAP_CACHE_KEY = "firebase-bootstrap-shell";
export const CRITICAL_MODULES_CACHE_KEY = "critical-modules-shell";
export const STARTUP_RESOURCES_CACHE_KEY = "startup-resources-shell";
