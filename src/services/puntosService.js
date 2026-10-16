import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { getOrFetchCached, invalidateCacheGroup } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

// Puntos y ranking cambian con cada acción: caché corta
const PUNTOS_CACHE_PREFIX = "sii-aqua-puntos:";
const RANKING_CACHE_PREFIX = "sii-aqua-ranking:";
const PUNTOS_CACHE_TTL_MS = 5 * 60 * 1000;

const adaptarFecha = (ms) => ({
  toDate: () => new Date(ms),
  toMillis: () => ms,
});

const adaptarItems = (items = []) =>
  items.map((item) => ({
    ...item,
    fechaCreacion: adaptarFecha(item.fechaCreacion || 0),
  }));

// Registrar puntos por una acción (lo calcula y guarda la Cloud Function "registrarPuntos")
export const registrarPuntos = async (userId, tipo, referencia) => {
  try {
    const result = await call("registrarPuntos")({ userId, tipo, referencia });
    invalidateCacheGroup(PUNTOS_CACHE_PREFIX, RANKING_CACHE_PREFIX);
    return result.data?.ok === true;
  } catch (error) {
    console.error("Error al registrar puntos:", error);
    return false;
  }
};

export const obtenerPuntosUsuario = async (userId, anio) => {
  try {
    return await getOrFetchCached(`${PUNTOS_CACHE_PREFIX}resumen:${userId}:${anio ?? ""}`, async () => {
      const result = await call("obtenerPuntosUsuario")({ userId, anio });
      return result.data || null;
    }, PUNTOS_CACHE_TTL_MS);
  } catch (error) {
    console.error("Error al obtener información de puntos:", error);
    return null;
  }
};

export const obtenerHistorialPuntos = async (userId, limitNum = 10, anio) => {
  try {
    const items = await getOrFetchCached(`${PUNTOS_CACHE_PREFIX}historial:${userId}:${limitNum}:${anio ?? ""}`, async () => {
      const result = await call("obtenerHistorialPuntos")({ userId, limitNum, anio });
      return result.data?.items ?? [];
    }, PUNTOS_CACHE_TTL_MS);
    return adaptarItems(items);
  } catch (error) {
    console.error("Error al obtener historial de puntos:", error);
    return [];
  }
};

export const obtenerUltimosLogros = async (userId, limitNum = 4, anio) => {
  try {
    const items = await getOrFetchCached(`${PUNTOS_CACHE_PREFIX}logros:${userId}:${limitNum}:${anio ?? ""}`, async () => {
      const result = await call("obtenerUltimosLogros")({ userId, limitNum, anio });
      return result.data?.items ?? [];
    }, PUNTOS_CACHE_TTL_MS);
    return adaptarItems(items);
  } catch (error) {
    console.error("Error al obtener últimos logros:", error);
    return [];
  }
};

export const obtenerObjetivosCompletados = async (userId, anio) => {
  try {
    return await getOrFetchCached(`${PUNTOS_CACHE_PREFIX}objetivos:${userId}:${anio ?? ""}`, async () => {
      const result = await call("obtenerObjetivosCompletados")({ userId, anio });
      return result.data?.objetivos || {};
    }, PUNTOS_CACHE_TTL_MS);
  } catch (error) {
    console.error("Error al obtener objetivos completados:", error);
    return {};
  }
};
