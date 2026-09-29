import { readSessionCache, writeSessionCache, clearCachedData, clearCachedByPrefix } from "../utils/cacheStore";
import { functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";

const createNotaFunction = httpsCallable(functions, "createNota");
const updateNotaFunction = httpsCallable(functions, "updateNota");
const deleteNotaFunction = httpsCallable(functions, "deleteNota");
const obtenerNotasPorUsuarioFunction = httpsCallable(functions, "obtenerNotasPorUsuario");

const CACHE_KEY = "sii-aqua-notas-cache";

// CREAR
export const createNota = async (data) => {
    const result = await createNotaFunction(data);
    const nota = result?.data || result;
    clearCachedData(`${CACHE_KEY}:${String(data?.userId || "anon")}`);
    return nota;
};

// OBTENER (FIX REAL)
export const obtenerNotasPorUsuario = async (usuarioId) => {
    const cacheKey = `${CACHE_KEY}:${String(usuarioId || "anon")}`;
    const cached = readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await obtenerNotasPorUsuarioFunction({ userId: usuarioId });
    const notas = Array.isArray(result?.data) ? result.data : [];
    writeSessionCache(cacheKey, notas);
    return notas;
};

// UPDATE
export const updateNota = async (docId, data) => {
    const result = await updateNotaFunction({ docId, ...data });
    clearCachedByPrefix(CACHE_KEY);
    return result?.data || result;
};

// DELETE
export const deleteNota = async (docId) => {
    const result = await deleteNotaFunction({ docId });
    clearCachedByPrefix(CACHE_KEY);
    return result?.data || result;
};