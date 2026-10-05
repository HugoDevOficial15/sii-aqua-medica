import { httpsCallable } from "firebase/functions"
import { functions } from "../config/firebase";

import { clearCachedData, readSessionCache, writeSessionCache, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const getSalas = call("getSalas");
const agregarSala = call("agregarSala");
const eliminarSala = call("eliminarSala");
const editarSala = call("editarSala");
    
const SALAS_CACHE_KEY = "sii-aqua-salas-cache";


// OBTENER SALAS

export const fetchSalas = async () => {
    const cached = readMemoryCache(SALAS_CACHE_KEY) ?? readSessionCache(SALAS_CACHE_KEY);
    if (cached) return cached;

    const result = await getSalas();
    const salas = (result.data ?? []).map((sala) => ({
        ...sala,
        activo: sala.activo ?? true,
    }));
    writeMemoryCache(SALAS_CACHE_KEY, salas);
    writeSessionCache(SALAS_CACHE_KEY, salas);
    return salas;
}

// AGREGAR SALA

export const addSala = async (nombre, activo = true) => {
    const result = await agregarSala({ nombre, activo });
    const sala = result.data ?? null;
    if (sala) {
        clearCachedData(SALAS_CACHE_KEY);
    }
    return sala;
};

// ELIMINAR SALA

export const removeSala = async (id) => {
    const result = await eliminarSala({ id });
    const sala = result.data ?? null;
    if (sala) {
        clearCachedData(SALAS_CACHE_KEY);
    }
    return sala;
};

// EDITAR SALA

export const updateSala = async (id, nombre, activo) => {
    const result = await editarSala({ id, nombre, activo });
    const sala = result.data ?? null;
    if (sala) {
        clearCachedData(SALAS_CACHE_KEY);
    }
    return sala;
};