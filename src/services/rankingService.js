import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { getOrFetchCached } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);


const RANKING_CACHE_PREFIX = "sii-aqua-ranking:";
const RANKING_CACHE_TTL_MS = 5 * 60 * 1000;

const SIN_POSICION = {
  posicionArea: 0,
  posicionGlobal: 0,
  totalEnArea: 0,
  nombreArea: "Sin Área",
  puntos: 0,
  nivel: "Bronce"
};

// TOP DE MI ÁREA (compañeros de trabajo)
export const obtenerTopArea = async (nombreArea, limitNum = 3) => {
  try {
    return await getOrFetchCached(`${RANKING_CACHE_PREFIX}top-area:${nombreArea}:${limitNum}`, async () => {
      const result = await call("obtenerTopArea")({ nombreArea, limitNum });
      return result.data?.items || [];
    }, RANKING_CACHE_TTL_MS);
  } catch (error) {
    console.error("Error al obtener top área:", error);
    return [];
  }
};

// TOP GLOBAL
export const obtenerTopGlobal = async (limitNum = 3) => {
  try {
    return await getOrFetchCached(`${RANKING_CACHE_PREFIX}top-global:${limitNum}`, async () => {
      const result = await call("obtenerTopGlobal")({ limitNum });
      return result.data?.items || [];
    }, RANKING_CACHE_TTL_MS);
  } catch (error) {
    console.error("Error al obtener top global:", error);
    return [];
  }
};

// Mi posición en el área
export const obtenerMiPosicionArea = async (userId) => {
  try {
    return await getOrFetchCached(`${RANKING_CACHE_PREFIX}mi-posicion:${userId}`, async () => {
      const result = await call("obtenerMiPosicionArea")({ userId });
      return result.data || SIN_POSICION;
    }, RANKING_CACHE_TTL_MS);
  } catch (error) {
    return SIN_POSICION;
  }
};

// Todos los usuarios del área para comparativa
export const obtenerUsuariosArea = async (nombreArea) => {
  try {
    return await getOrFetchCached(`${RANKING_CACHE_PREFIX}usuarios-area:${nombreArea}`, async () => {
      const result = await call("obtenerUsuariosArea")({ nombreArea });
      return result.data?.items || [];
    }, RANKING_CACHE_TTL_MS);
  } catch (error) {
    console.error("Error al obtener users del área:", error);
    return [];
  }
};
