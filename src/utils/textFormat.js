// Normaliza un nombre antes de guardarlo: MAYÚSCULAS, sin espacios dobles,
// sin espacios al inicio/final. Conserva acentos y caracteres especiales.
export const normalizeName = (value) =>
    String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();