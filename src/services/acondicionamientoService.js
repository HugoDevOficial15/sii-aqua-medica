import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const crearAcondicionamientoFunction = call("crearAcondicionamiento");
const obtenerAcondicionamientoFunction = call("obtenerAcondicionamiento");
const actualizarAcondicionamientoFunction = call("actualizarAcondicionamiento");

const CACHE_KEY = "sii-aqua-acondicionamiento-cache";

export const crearAcondicionamiento = async (data) => {
    const result = await crearAcondicionamientoFunction(data || {});
    clearCachedData(CACHE_KEY);
    return result?.data ?? null;
};

export const obtenerAcondicionamiento = async (forceRefresh = false) => {
    if (forceRefresh) {
        clearCachedData(CACHE_KEY);
    }

    const cached = !forceRefresh ? readCachedData(CACHE_KEY) : null;
    if (cached) {
        return cached;
    }

    const result = await obtenerAcondicionamientoFunction();
    const items = Array.isArray(result?.data?.materialAcondicionamiento)
        ? result.data.materialAcondicionamiento
        : [];

    writeCachedData(CACHE_KEY, items);
    return items;
};

export const actualizarAcondicionamiento = async (id, data) => {
    const result = await actualizarAcondicionamientoFunction({ id, data });
    clearCachedData(CACHE_KEY);
    return result?.data ?? null;
};