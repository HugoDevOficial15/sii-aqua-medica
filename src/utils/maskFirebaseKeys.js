/**
 * Enmascara keys sensibles de Firebase en logs.
 * Mantiene la consola segura sin romper la serialización nativa del navegador.
 */

const maskSensitiveString = (value = "") => {
  let masked = String(value);

  masked = masked.replace(/AIzaSy[A-Za-z0-9_-]{35}/g, "AIzaSy***MASKED***");
  masked = masked.replace(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, "JWT***MASKED***");
  masked = masked.replace(/(\?.*auth=)[A-Za-z0-9_-]*/g, "?auth=***MASKED***");
  masked = masked.replace(/uid["\']?\s*:\s*["\']?[A-Za-z0-9]{28}["\']?/gi, "uid: ***MASKED***");
  masked = masked.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "***UUID_MASKED***");
  masked = masked.replace(/session["\']?\s*:\s*["\']?[A-Za-z0-9_-]{50,}["\']?/gi, "session: ***MASKED***");
  masked = masked.replace(/nómina["\']?\s*:\s*["\']?[A-Z0-9#]{4,}["\']?/gi, "nómina: ***MASKED***");
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (email) => {
    const [local, domain] = email.split("@");
    return local.substring(0, 2) + "***@" + domain;
  });

  return masked;
};

const maskConsoleValue = (value, seen = new WeakSet()) => {
  if (typeof value === "string") {
    return maskSensitiveString(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value == null || typeof value === "bigint") {
    return value;
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskConsoleValue(item, seen));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskSensitiveString(value.message),
      stack: value.stack ? maskSensitiveString(value.stack) : undefined,
    };
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    const masked = {};
    for (const [key, entryValue] of Object.entries(value)) {
      const lowerKey = String(key).toLowerCase();

      if (lowerKey.includes("uid") || lowerKey.includes("token") || lowerKey.includes("key") || lowerKey.includes("secret")) {
        masked[key] = "***MASKED***";
        continue;
      }

      masked[key] = maskConsoleValue(entryValue, seen);
    }

    return masked;
  }

  return value;
};

export const maskFirebaseKeys = () => {
  const wrapConsoleMethod = (methodName) => {
    const originalMethod = console[methodName];

    if (!originalMethod || originalMethod.__isMasked) {
      return;
    }

    const safeWrapper = (...args) => {
      try {
        return originalMethod.apply(console, args.map((arg) => maskConsoleValue(arg)));
      } catch (error) {
        try {
          return originalMethod.apply(console, args);
        } catch (fallbackError) {
          return undefined;
        }
      }
    };

    safeWrapper.__isMasked = true;
    console[methodName] = safeWrapper;
  };

  wrapConsoleMethod("log");
  wrapConsoleMethod("error");
  wrapConsoleMethod("warn");
};

export default maskFirebaseKeys;
