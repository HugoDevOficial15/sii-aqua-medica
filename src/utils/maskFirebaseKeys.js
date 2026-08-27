/**
 * Enmascara keys sensibles de Firebase en logs
 * Evita que las credenciales se expongan en consola
 */

export const maskFirebaseKeys = () => {
  // Función para enmascarar strings sensibles
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const maskSensitiveData = (args) => {
    return args.map((arg) => {
      if (typeof arg === "string") {
        // Ocultar API keys
        arg = arg.replace(/AIzaSy[A-Za-z0-9_-]{35}/g, "AIzaSy***MASKED***");

        // Ocultar tokens JWT
        arg = arg.replace(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, "JWT***MASKED***");

        // Ocultar URLs de Firebase con credenciales
        arg = arg.replace(/(\?.*auth=)[A-Za-z0-9_-]*/g, "?auth=***MASKED***");

        // Ocultar UIDs de Firebase (formato típico)
        arg = arg.replace(/uid["\']?\s*:\s*["\']?[A-Za-z0-9]{28}["\']?/gi, "uid: ***MASKED***");

        // Ocultar UUIDs
        arg = arg.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "***UUID_MASKED***");

        // Ocultar tokens de sesión
        arg = arg.replace(/session["\']?\s*:\s*["\']?[A-Za-z0-9_-]{50,}["\']?/gi, "session: ***MASKED***");

        // Ocultar nóminas/IDs de usuario
        arg = arg.replace(/nómina["\']?\s*:\s*["\']?[A-Z0-9#]{4,}["\']?/gi, "nómina: ***MASKED***");

        // Ocultar emails en logs
        arg = arg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (email) => {
          const [local, domain] = email.split("@");
          return local.substring(0, 2) + "***@" + domain;
        });
      } else if (typeof arg === "object" && arg !== null) {
        // Enmascarar objetos recursivamente
        return maskObjectData(arg);
      }
      return arg;
    });
  };

  const maskObjectData = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(maskObjectData);
    }

    if (typeof obj === "object" && obj !== null) {
      const masked = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const lowerKey = key.toLowerCase();

          if (lowerKey.includes("uid") || lowerKey.includes("token") || lowerKey.includes("key") || lowerKey.includes("secret")) {
            masked[key] = "***MASKED***";
          } else if (typeof value === "string") {
            masked[key] = maskSensitiveData([value])[0];
          } else if (typeof value === "object") {
            masked[key] = maskObjectData(value);
          } else {
            masked[key] = value;
          }
        }
      }
      return masked;
    }

    return obj;
  };

  // Reemplazar funciones de consola SOLO si no están ya reemplazadas
  if (!console.log.__isMasked) {
    console.log = function (...args) {
      originalLog(...maskSensitiveData(args));
    };
    console.log.__isMasked = true;
  }

  if (!console.error.__isMasked) {
    console.error = function (...args) {
      originalError(...maskSensitiveData(args));
    };
    console.error.__isMasked = true;
  }

  if (!console.warn.__isMasked) {
    console.warn = function (...args) {
      originalWarn(...maskSensitiveData(args));
    };
    console.warn.__isMasked = true;
  }
};

export default maskFirebaseKeys;
