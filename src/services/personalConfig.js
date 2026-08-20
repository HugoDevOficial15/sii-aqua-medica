const normalizeText = (value) =>
  (value ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Filtro de campos que no sean nulos, indefinidos o vacíos

const AREA_ALIASES = {
  "contabilidad": "contabilidad",
  "recursos humanos": "recursos humanos",
  "recursos humanos": "recursos humanos",
  "recursos_humanos": "recursos humanos",
  "rrhh": "recursos humanos",
  "produccion": "produccion",
  "producción": "produccion",
  "almacen": "almacen",
  "almacén": "almacen",
  "mantenimiento": "mantenimiento",
  "seguridad": "seguridad",
  "salud ocupacional": "salud ocupacional",
  "salud_ocupacional": "salud ocupacional",
  "validaciones": "validaciones",
  "comite tecnico": "comite tecnico",
  "comite tecnico": "comite tecnico",
  "comité técnico": "comite tecnico",
  "sistemas": "sistemas",
};

const normalizeArea = (value) => AREA_ALIASES[normalizeText(value)] || normalizeText(value);

export const ZONAS_POR_DEPARTAMENTO = {
  "salud ocupacional": [],
  vigilancia: [],
  servicios: [],
  almacen: [],
};

export const JEFE_DEPARTAMENTO = {
  contabilidad: [],
  "recursos humanos": [],
  produccion: [],
  almacen: [],
  mantenimiento: [],
  seguridad: [],
  "salud ocupacional": [], 
  validaciones: [],
  "comite tecnico": [],
  sistemas: [],
};

export const JEFE_DE_ZONA = {
  norte: [], // 
  sur: [],
  centro: [],
};

const isJefeArea = (usuario, areaEsperada) => {
  if (!usuario) return false;

  const area = normalizeArea(usuario.area);
  const rol = normalizeText(usuario.rol);
  const puesto = normalizeText(usuario.puesto);
  const nomina = String(usuario.nomina ?? "");

// Filtro de jefes por nómina y por título, considerando el área esperada y el área del usuario.

  const esJefePorNomina = (JEFE_DEPARTAMENTO[areaEsperada] || []).some((n) => String(n) === nomina);
  const esJefePorTitulo =
    area === areaEsperada &&
    (rol.includes("jefe") ||
      rol.includes("coordinador") ||
      puesto.includes("jefe") ||
      puesto.includes("responsable de recursos humanos") ||
      puesto.includes("responsable de importacion") ||
      puesto.includes("coordinador"));

  return esJefePorNomina || esJefePorTitulo;
};

export const canAccessPersonalSection = (usuario) => {
  if (!usuario) return false;
  if (usuario.rol === "admin_sistemas") return true;

  const nomina = String(usuario.nomina ?? "");
  const area = normalizeArea(usuario.area);
  const zona = normalizeText(usuario.zona || usuario.areaZona || "");

  const esJefeDepartamento = isJefeArea(usuario, area);
  const esJefeZona = Object.entries(JEFE_DE_ZONA).some(([zonaKey, jefes]) => {
    return normalizeText(zonaKey) === zona && jefes.some((n) => String(n) === nomina);
  });

  if (esJefeDepartamento || esJefeZona) return true;

  const zonasPermitidas = ZONAS_POR_DEPARTAMENTO[area] || [];
  return zonasPermitidas.some((z) => normalizeText(z) === zona);
};

// FILTRO DE PERSONAL

export const getAllowedUsersForPersonal = (usuarios = [], usuarioActual) => {
  if (!usuarioActual) return [];

  const rolActual = normalizeText(usuarioActual.rol);
  const areaActual = normalizeArea(usuarioActual.area);
  const zonaActual = normalizeText(usuarioActual.zona || usuarioActual.areaZona || "");
  const nominaActual = String(usuarioActual.nomina ?? "");

  if (rolActual === "admin_sistemas") {
    return usuarios.filter((usuario) => {
      if (!usuario || usuario.activo === false) return false;
      const rol = normalizeText(usuario.rol);
      const area = normalizeArea(usuario.area);
      return rol.includes("operador") && area === "sistemas";
    });
  }

  const esJefeDepartamento = isJefeArea(usuarioActual, areaActual);
  const esJefeZona = Object.entries(JEFE_DE_ZONA).some(([zonaKey, jefes]) => {
    return normalizeText(zonaKey) === zonaActual && jefes.some((n) => String(n) === nominaActual);
  });

  return usuarios.filter((usuario) => {
    if (!usuario || usuario.activo === false) return false;

    const rol = normalizeText(usuario.rol);
    const area = normalizeArea(usuario.area);
    const zona = normalizeText(usuario.zona || usuario.areaZona || "");

    const esOperador = rol.includes("operador");
    if (!esOperador) return false;

    if (esJefeDepartamento) {
      return area === areaActual;
    }

    if (esJefeZona) {
      return area === areaActual && zona === zonaActual;
    }

    return area === areaActual && zona === zonaActual;
  });
};
