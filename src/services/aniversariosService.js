import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { clearCachedData, clearCachedByPrefix, invalidateCacheGroup, readCachedData, writeCachedData } from "../utils/cacheStore";

const ANIVERSARIOS_CACHE_KEY = "sii-aqua-aniversarios-summary";
const ANIVERSARIOS_BY_MONTH_CACHE_KEY = "sii-aqua-aniversarios-by-month";
const ANIVERSARIOS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const getCumpleaniosPorMesFunction = httpsCallable(functions, "getCumpleaniosPorMes");
const getAniversariosByMesFunction = httpsCallable(functions, "getAniversariosByMes");

const getAniversariosCacheKey = () => {
    if (typeof window === "undefined") return ANIVERSARIOS_CACHE_KEY;

    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const userId = user?.uid || "anonymous";
        return `${ANIVERSARIOS_CACHE_KEY}-${userId}`;
    } catch (error) {
        return ANIVERSARIOS_CACHE_KEY;
    }
};

const getAniversariosByMesCacheKey = (mes) => {
    if (typeof window === "undefined") return `${ANIVERSARIOS_BY_MONTH_CACHE_KEY}-${mes}`;

    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const userId = user?.uid || "anonymous";
        return `${ANIVERSARIOS_BY_MONTH_CACHE_KEY}-${userId}-${mes}`;
    } catch (error) {
        return `${ANIVERSARIOS_BY_MONTH_CACHE_KEY}-${mes}`;
    }
};

const saveAniversariosCache = (data) => {
    writeCachedData(getAniversariosCacheKey(), data, ANIVERSARIOS_CACHE_TTL_MS);
};

const readAniversariosCache = () => {
    return readCachedData(getAniversariosCacheKey(), ANIVERSARIOS_CACHE_TTL_MS);
};

const saveAniversariosByMesCache = (mes, data) => {
    writeCachedData(getAniversariosByMesCacheKey(mes), data, ANIVERSARIOS_CACHE_TTL_MS);
};

const readAniversariosByMesCache = (mes) => {
    return readCachedData(getAniversariosByMesCacheKey(mes), ANIVERSARIOS_CACHE_TTL_MS);
};

const invalidateAniversariosCaches = (mes = null) => {
    clearCachedData(getAniversariosCacheKey());
    if (mes !== null && mes !== undefined) {
        clearCachedData(getAniversariosByMesCacheKey(mes));
    }
    clearCachedByPrefix("sii-aqua-aniversarios-summary");
    clearCachedByPrefix("sii-aqua-aniversarios-by-month");
    invalidateCacheGroup("sii-aqua-aniversarios-summary", "sii-aqua-aniversarios-by-month");
};

export const getCumpleaniosPorMes = async ({ source = "cache" } = {}) => {
    if (source === "cache") {
        const cached = readAniversariosCache();

        if (cached) {
            return cached;
        }

        return null;
    }

    const result = await getCumpleaniosPorMesFunction();
    const data = Array.isArray(result?.data) ? result.data : Array(12).fill(0);
    saveAniversariosCache(data);
    return data;
};

export const refreshCumpleaniosPorMes = async () => {
    invalidateAniversariosCaches();
    return getCumpleaniosPorMes({ source: "server" });
};

export const getAniversariosByMes = async (mes, { source = "cache" } = {}) => {
    if (source === "cache") {
        const cached = readAniversariosByMesCache(mes);
        if (cached) {
            return cached;
        }

        return null;
    }

    const result = await getAniversariosByMesFunction({ mes: Number(mes) });
    const payload = result?.data || { cumpleanios: [], aniversarios: [] };
    saveAniversariosByMesCache(mes, payload);
    return payload;
};

export const refreshAniversariosByMes = async (mes) => {
    invalidateAniversariosCaches(mes);
    return getAniversariosByMes(mes, { source: "server" });
};