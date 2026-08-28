import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";

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
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(getAniversariosCacheKey(), JSON.stringify(data));
    } catch (error) {
        console.warn("No se pudo guardar el cache de aniversarios:", error);
    }
};

const readAniversariosCache = () => {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(getAniversariosCacheKey());
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
};

const saveAniversariosByMesCache = (mes, data) => {
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(getAniversariosByMesCacheKey(mes), JSON.stringify(data));
    } catch (error) {
        console.warn("No se pudo guardar el cache del mes de aniversarios:", error);
    }
};

const readAniversariosByMesCache = (mes) => {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(getAniversariosByMesCacheKey(mes));
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
};

const parseFecha = (fechaStr) => {
    if (!fechaStr) return null;

    const [year, month, day] = fechaStr.split("-").map(Number);

    if ([year, month, day].some(value => Number.isNaN(value))) {
        return null;
    }

    return new Date(year, month - 1, day);
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

export const getCumpleaniosPorMes = async ({ source = "cache" } = {}) => {
    if (source === "cache") {
        const cached = readAniversariosCache();

        if (cached) {
            return cached;
        }

        return null;
    }

    const snapshot = await getDocs(
        query(collection(db, "users"), where("cumpleanos", "!=", null))
    );

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const conteoPorMes = Array(12).fill(0);

    usuarios.forEach(user => {
        if (!user.cumpleanos) return;

        const fecha = parseFecha(user.cumpleanos);

        if (!fecha) return;

        conteoPorMes[fecha.getMonth()] += 1;
    });

    saveAniversariosCache(conteoPorMes);
    return conteoPorMes;
};

export const refreshCumpleaniosPorMes = async () => {
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

    const snapshot = await getDocs(
        query(collection(db, "users"), where("fechaIngreso", "!=", null))
    );

    const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const cumpleanios = [];
    const aniversarios = [];

    usuarios.forEach(user => {

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
    return getAniversariosByMes(mes, { source: "server" });
};