import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const crearMateriaPrimaFunction = call("crearMateriaPrima");
const obtenerMateriaPrimaFunction = call("obtenerMateriaPrima");
const actualizarMateriaPrimaFunction = call("actualizarMateriaPrima");

const CACHE_KEY = "sii-aqua-materia-prima-cache";

export const crearMateriaPrima = async (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Se requieren datos válidos para crear la materia prima.");
    }

    const result = await crearMateriaPrimaFunction(data);
    clearCachedData(CACHE_KEY);
    return result?.data ?? null;
};

export const obtenerMateriaPrima = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const result = await obtenerMateriaPrimaFunction();
    const items = Array.isArray(result?.data?.materiaPrima) ? result.data.materiaPrima : [];

    writeCachedData(CACHE_KEY, items);
    return items;
};

export const actualizarMateriaPrima = async (id, data) => {
    if (!id) {
        throw new Error("Se requiere un ID válido para actualizar la materia prima.");
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Se requieren datos válidos para actualizar la materia prima.");
    }

    const result = await actualizarMateriaPrimaFunction({ id, data });
    clearCachedData(CACHE_KEY);
    return result?.data ?? null;
};