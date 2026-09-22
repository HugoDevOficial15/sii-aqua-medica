import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

import { clearCachedData, readSessionCache, writeSessionCache, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const getPuestosCallable = call("getPuestos");
const crearPuestoCallable = call("crearPuesto");
const updatePuestoCallable = call("updatePuesto");




const PUESTOS_CACHE_KEY = "sii-aqua-puestos-cache";
const CACHE_TTL_MS = 20 * 60 * 1000;

const readCache = (key) => readSessionCache(key);

const writeCache = (key, data) => writeSessionCache(key, data);

// Obtener datos.

export const getPuestos = async () => {
    const cached = readMemoryCache(PUESTOS_CACHE_KEY) ?? readSessionCache(PUESTOS_CACHE_KEY);
    if (Array.isArray(cached)) {
        return cached;
    }

    const result = await getPuestosCallable();
    const puestos = Array.isArray(result?.data) ? result.data : [];

    writeMemoryCache(PUESTOS_CACHE_KEY, puestos);
    writeSessionCache(PUESTOS_CACHE_KEY, puestos);
    return puestos;
};

// Crear
export const createPuesto = async (data) => {
    const result = await crearPuestoCallable({ nombre: data?.nombre ?? "" });
    clearCachedData(PUESTOS_CACHE_KEY);
    return result?.data ?? null;
};

// editar
export const updatePuesto = async (id, data = {}) => {
    const result = await updatePuestoCallable({
        id,
        nombre: data?.nombre ?? "",
        activo: typeof data?.activo === "boolean" ? data.activo : true,
    });
    clearCachedData(PUESTOS_CACHE_KEY);
    return result?.data ?? null;
};