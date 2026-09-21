import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";

import { db } from "../config/firebase";
import { clearCachedData, readSessionCache, writeSessionCache, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

const ref = collection(db, "puestos");

const PUESTOS_CACHE_KEY = "sii-aqua-puestos-cache";
const CACHE_TTL_MS = 20 * 60 * 1000;

const readCache = (key) => readSessionCache(key);

const writeCache = (key, data) => writeSessionCache(key, data);

// Obtener datos.
export const getPuestos = async () => {
    const cached = readMemoryCache(PUESTOS_CACHE_KEY) ?? readSessionCache(PUESTOS_CACHE_KEY);
    if (cached) {
        return cached;
    }

    const snap = await getDocs(ref);
    const puestos = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    }));

    writeMemoryCache(PUESTOS_CACHE_KEY, puestos);
    writeSessionCache(PUESTOS_CACHE_KEY, puestos);
    return puestos;
}

// Crear
export const createPuesto = async (data) => {
    const result = await addDoc(ref, {
        nombre: data.nombre,
        activo: true,
        createdAt: new Date(),
    });
    clearCachedData(PUESTOS_CACHE_KEY);
    return result;
}

// editar
export const updatePuesto = async (id, data) => {

    const ref = doc(db, "puestos", id)

    const result = await updateDoc(ref, data);
    clearCachedData(PUESTOS_CACHE_KEY);
    return result;
}