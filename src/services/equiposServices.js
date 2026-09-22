import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import {
  readSessionCache,
  writeSessionCache,
  readMemoryCache,
  writeMemoryCache,
  clearCachedByPrefix,
} from "../utils/cacheStore";

const CACHE_KEY = "sii-aqua-equipos-cache";
const call = (name) => httpsCallable(functions, name);

const getEquiposFunction = call("getEquipos");
const createEquipoFunction = call("createEquipo");
const updateEquipoFunction = call("updateEquipo");
const activarEquipoFunction = call("activarEquipo");
const bajaEquipoFunction = call("bajaEquipo");

const invalidateEquiposCache = () => {
  clearCachedByPrefix(CACHE_KEY);
};

export const getEquipos = async ({ estado = null, tipo = null, pageSize = null, cursor = null } = {}) => {
  const cacheKey = `${CACHE_KEY}:${estado === null ? "all" : String(estado)}:${tipo || "all"}:${pageSize ?? "all"}:${cursor ?? "first"}`;
  const cached = readMemoryCache(cacheKey) ?? readSessionCache(cacheKey);

  if (cached && pageSize === null) {
    return cached;
  }

  const result = await getEquiposFunction({ estado, tipo, pageSize, cursor });
  const data = result?.data ?? [];
  const equipos = Array.isArray(data) ? data : (data.items ?? []);

  if (pageSize === null) {
    writeMemoryCache(cacheKey, equipos);
    writeSessionCache(cacheKey, equipos);
  }

  return data;
};

export const createEquipo = async (data) => {
  const result = await createEquipoFunction(data);
  const equipo = result?.data ?? null;
  invalidateEquiposCache();
  return equipo;
};

export const updateEquipo = async (id, data) => {
  const result = await updateEquipoFunction({ id, ...data });
  const equipo = result?.data ?? null;
  invalidateEquiposCache();
  return equipo;
};

export const activarEquipo = async (id) => {
  const result = await activarEquipoFunction({ id });
  const equipo = result?.data ?? null;
  invalidateEquiposCache();
  return equipo;
};

export const bajaEquipo = async (id) => {
  const result = await bajaEquipoFunction({ id });
  const equipo = result?.data ?? null;
  invalidateEquiposCache();
  return equipo;
};
