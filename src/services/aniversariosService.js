import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { clearCachedData, clearCachedByPrefix, invalidateCacheGroup, readCachedData, writeCachedData } from "../utils/cacheStore";

const ANIVERSARIOS_CACHE_KEY = "sii-aqua-aniversarios-summary";
const ANIVERSARIOS_BY_MONTH_CACHE_KEY = "sii-aqua-aniversarios-by-month";

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
    writeCachedData(getAniversariosCacheKey(), data);
};

const readAniversariosCache = () => {
    return readCachedData(getAniversariosCacheKey(), 20 * 60 * 1000);
};

const saveAniversariosByMesCache = (mes, data) => {
    writeCachedData(getAniversariosByMesCacheKey(mes), data);
};

const readAniversariosByMesCache = (mes) => {
    return readCachedData(getAniversariosByMesCacheKey(mes), 20 * 60 * 1000);
};

const parseFecha = (fechaValue) => {
    if (!fechaValue) return null;

    let fecha = null;

    if (typeof fechaValue === "string") {
        const value = fechaValue.trim();

        if (!value) return null;

        const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}$/);
        if (isoMatch) {
            const [year, month, day] = value.split("-").map(Number);
            if ([year, month, day].every((part) => !Number.isNaN(part))) {
                fecha = new Date(year, month - 1, day);
            }
        }

        if (!fecha) {
            fecha = new Date(value);
        }
    } else if (fechaValue instanceof Date) {
        fecha = fechaValue;
    } else if (typeof fechaValue?.toDate === "function") {
        fecha = fechaValue.toDate();
    } else if (typeof fechaValue?.seconds === "number") {
        fecha = new Date(fechaValue.seconds * 1000);
    }

    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
        return null;
    }

    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
};

const calcularAnios = (fechaIngreso) => {
    const hoy = new Date();
    let anios = hoy.getFullYear() - fechaIngreso.getFullYear();

    const fechaCumpleAnio = new Date(hoy.getFullYear(), fechaIngreso.getMonth(), fechaIngreso.getDate());

    if (hoy < fechaCumpleAnio) {
        anios -= 1;
    }

    return anios;
};

const normalizarRol = (rol) => String(rol ?? "").trim().toLowerCase();

const esOperador = (user) => {
    const rol = normalizarRol(user?.rol);
    return rol === "operador" || rol.includes("operador");
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

    const snapshot = await getDocs(collection(db, "users"));

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const conteoPorMes = Array(12).fill(0);

    usuarios.forEach(user => {
        if (!esOperador(user) || !user.cumpleanos) return;

        const fecha = parseFecha(user.cumpleanos);

        if (!fecha) return;

        conteoPorMes[fecha.getMonth()] += 1;
    });

    saveAniversariosCache(conteoPorMes);
    return conteoPorMes;
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

    const snapshot = await getDocs(collection(db, "users"));

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const cumpleanios = [];
    const aniversarios = [];

    usuarios.forEach(user => {
        if (!esOperador(user)) return;

        // 🎂 CUMPLEAÑOS
        if (user.cumpleanos) {

            const fecha = parseFecha(user.cumpleanos);

            if (!fecha) return;

            const mesUser = fecha.getMonth() + 1;

            if (mesUser === mes) {
                cumpleanios.push({
                    ...user,
                    dia: fecha.getDate(),
                    fechaCompleta: fecha.toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short"
                    })
                });
            }
        }

        // 🏢 ANIVERSARIOS
        if (user.fechaIngreso) {
            const fecha = parseFecha(user.fechaIngreso);

            if (!fecha) return;

            const mesUser = fecha.getMonth() + 1;

            if (mesUser === mes) {
                const anios = calcularAnios(fecha);

                if (anios < 1) return;

                aniversarios.push({
                    ...user,
                    dia: fecha.getDate(),
                    fechaCompleta: fecha.toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short"
                    }),
                    anios,
                    esMultiple5: anios % 5 === 0
                });
            }
        }

    });

    // ordenar
    cumpleanios.sort((a, b) => a.dia - b.dia);
    aniversarios.sort((a, b) => b.anios - a.anios);

    const result = { cumpleanios, aniversarios };
    saveAniversariosByMesCache(mes, result);
    return result;
};

export const refreshAniversariosByMes = async (mes) => {
    invalidateAniversariosCaches(mes);
    return getAniversariosByMes(mes, { source: "server" });
};