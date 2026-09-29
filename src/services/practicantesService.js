import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import {
  readCachedData,
  writeCachedData,
  invalidateCacheGroup,
} from "../utils/cacheStore";

const PRACTICANTES_CACHE_KEY = "sii-aqua-practicantes-cache";
const PRACTICANTES_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const PRACTICANTES_SEARCH_CACHE_TTL_MS = 2 * 60 * 1000;

const call = (name) => httpsCallable(functions, name);
const getPracticantesPageFunction = call("getPracticantesPage");
const searchPracticantesFunction = call("searchPracticantes");
const createPracticanteFunction = call("createPracticante");
const updatePracticanteFunction = call("updatePracticante");

const invalidatePracticantesCaches = () => {
  invalidateCacheGroup(
    PRACTICANTES_CACHE_KEY,
    "sii-aqua-practicantes-page:",
    "sii-aqua-practicantes-search:",
  );
};

export const getPracticantesPage = async ({ cursor = null, pageSize = 30 } = {}) => {
  const cacheKey = `sii-aqua-practicantes-page:${cursor ?? "first"}:${pageSize}`;
  const cached = readCachedData(cacheKey, PRACTICANTES_PAGE_CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const result = await getPracticantesPageFunction({ cursor, pageSize });
    const page = result.data || { practicantes: [], hasMore: false, nextCursor: null };
    writeCachedData(cacheKey, page, PRACTICANTES_PAGE_CACHE_TTL_MS);
    return page;
  } catch (error) {
    console.error("Error fetching practicantes page:", error);
    return { practicantes: [], hasMore: false, nextCursor: null };
  }
};

export const searchPracticantes = async (search) => {
  const normalizedSearch = String(search || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  const cacheKey = `sii-aqua-practicantes-search:${normalizedSearch}`;
  const cached = readCachedData(cacheKey, PRACTICANTES_SEARCH_CACHE_TTL_MS);
  if (cached) return cached;

  try {
    const result = await searchPracticantesFunction({ search });
    const data = result.data || { practicantes: [], hasMore: false };
    writeCachedData(cacheKey, data, PRACTICANTES_SEARCH_CACHE_TTL_MS);
    return data;
  } catch (error) {
    console.error("Error searching practicantes:", error);
    return { practicantes: [], hasMore: false };
  }
};

export const createPracticante = async (data) => {
  try {
    const practicanteData = {
      nombre: data.nombre || "",
      area: data.area || "",
      cumpleanos: data.cumpleanos || "",
      fechaIngreso: data.fechaIngreso || "",
      curp: data.curp || "",
      escuela: data.escuela || "",
      puesto: data.puesto || "",
      nomina: Number(data.nomina) || 0,
      activo: true,
      estado: "activo",
      rol: "practicante",
      createdAt: new Date().toISOString(),
    };

    // Crear en sii-aqua-medica
    const result = await createPracticanteFunction(practicanteData);

    // También crear en AquamedicaSoftware (solo 7 campos permitidos, sin puesto, rfc, nss, email)
    const datosAquaMedica = {
      nombre: data.nombre,
      nomina: Number(data.nomina),
      escuela: data.escuela || "",
      area: data.area || "",
      fechaIngreso: data.fechaIngreso || "",
      cumpleanos: data.cumpleanos || "",
      curp: data.curp || "",
    };
    await createPracticanteInAquaMedica(datosAquaMedica);

    invalidatePracticantesCaches();
    return result.data || {};
  } catch (error) {
    console.error("Error creating practicante:", error);
    throw error;
  }
};

const createPracticanteInAquaMedica = async (data) => {
  try {
    const AQUAMEDICA_URL = "https://us-central1-aquamedica2023.cloudfunctions.net";

    const response = await fetch(`${AQUAMEDICA_URL}/createPracticanteAquaMedica`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✓ Practicante creado en AquaMedica:", result);
    return result;
  } catch (error) {
    console.error("⚠ Error creating practicante in AquaMedica:", error);
  }
};

export const updatePracticante = async (id, data) => {
  try {
    const practicanteData = {
      nombre: data.nombre || "",
      area: data.area || "",
      cumpleanos: data.cumpleanos || "",
      fechaIngreso: data.fechaIngreso || "",
      curp: data.curp || "",
      escuela: data.escuela || "",
      puesto: data.puesto || "",
      nomina: data.nomina ? Number(data.nomina) : undefined,
      activo: data.activo !== undefined ? data.activo : true,
      estado: data.estado || "activo",
    };

    // Actualizar en sii-aqua-medica
    const result = await updatePracticanteFunction({ id, data: practicanteData });

    // También actualizar en AquamedicaSoftware (solo 6 campos permitidos, sin puesto, rfc, nss, email)
    if (data.nomina) {
      const datosAquaMedica = {};
      if (data.nombre) datosAquaMedica.nombre = data.nombre;
      if (data.escuela) datosAquaMedica.escuela = data.escuela;
      if (data.area) datosAquaMedica.area = data.area;
      if (data.fechaIngreso) datosAquaMedica.fechaIngreso = data.fechaIngreso;
      if (data.cumpleanos) datosAquaMedica.cumpleanos = data.cumpleanos;
      if (data.curp) datosAquaMedica.curp = data.curp;

      await updatePracticanteInAquaMedica(data.nomina, datosAquaMedica);
    }

    invalidatePracticantesCaches();
    return result.data || {};
  } catch (error) {
    console.error("Error updating practicante:", error);
    throw error;
  }
};

const updatePracticanteInAquaMedica = async (nomina, data) => {
  try {
    const AQUAMEDICA_URL = "https://us-central1-aquamedica2023.cloudfunctions.net";

    const response = await fetch(`${AQUAMEDICA_URL}/updatePracticanteAquaMedica`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomina, ...data }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✓ Practicante actualizado en AquaMedica:", result);
    return result;
  } catch (error) {
    console.error("⚠ Error updating practicante in AquaMedica:", error);
    // No lanzar error para no interrumpir la actualización local
  }
};
