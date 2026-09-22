import { httpsCallable } from "firebase/functions";
import { functions, db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import {
    readSessionCache,
    writeCachedData,
    clearCachedByPrefix,
} from "../utils/cacheStore";

const SERVICIOS_CACHE_KEY = "sii-aqua-servicios-cache";
const SERVICIOS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const call = (name) => httpsCallable(functions, name);

const getServiciosFunction = call("getServicios");
const getServiciosGlobalFunction = call("getServiciosGlobal");
const crearServicioFunction = call("crearServicio");
const actualizarServicioFunction = call("actualizarServicio");
const getDiasBloqueadosFunction = call("getDiasBloqueados");
const bloquearDiaFunction = call("bloquearDia");
const eliminarDiaBloqueadoFunction = call("eliminarDiaBloqueado");
const bloquearHorarioFunction = call("bloquearHorario");
const getBloqueosHorariosFunction = call("getBloqueosHorarios");
const eliminarBloqueosHorarioFunction = call("eliminarBloqueosHorario");

const invalidateServiciosCaches = () => {
    clearCachedByPrefix(`${SERVICIOS_CACHE_KEY}:`);
    clearCachedByPrefix("sii-aqua-servicios-programados-cache:");
};

export const getServicios = async (areaId, anio, mes) => {
    const cacheKey = `${SERVICIOS_CACHE_KEY}:${String(areaId || "global")}:${anio}:${mes}`;
    const cached = readSessionCache(cacheKey, SERVICIOS_CACHE_TTL_MS);
    if (cached) {
        return cached;
    }

    const areaID = String(areaId || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const result = await getServiciosFunction({ areaId: areaID, anio, mes });
    const servicios = Array.isArray(result?.data) ? result.data : [];

    writeCachedData(cacheKey, servicios);
    return servicios;
};

export const getServiciosGlobal = async (anio, mes) => {
    const cacheKey = `${SERVICIOS_CACHE_KEY}:global:${anio}:${mes}`;
    const cached = readSessionCache(cacheKey, SERVICIOS_CACHE_TTL_MS);
    if (cached) {
        return cached;
    }

    const result = await getServiciosGlobalFunction({ anio, mes });
    const servicios = Array.isArray(result?.data) ? result.data : [];

    writeCachedData(cacheKey, servicios);
    return servicios;
};

export const crearServicio = async (data) => {
    const payload = {
        ...data,
        estado: "pendiente",
        createdAt: new Date()
    };

    const result = await crearServicioFunction(payload);
    const servicio = result?.data ?? null;
    invalidateServiciosCaches();
    return servicio;
};

export const actualizarServicio = async (id, data) => {
    const result = await actualizarServicioFunction({ id, ...data });
    const servicio = result?.data ?? null;
    invalidateServiciosCaches();
    return servicio;
};

export const crearLogEquipo = async (equipoId, log) => {
    return await addDoc(collection(db, "equipos", equipoId, "logs"), log);
};

export const getDiasBloqueados = async (anio, mes) => {
    const result = await getDiasBloqueadosFunction({ anio, mes });
    return Array.isArray(result?.data) ? result.data : [];
};

export const bloquearDia = async (fecha, motivo) => {
    const result = await bloquearDiaFunction({ fecha, motivo });
    const bloqueado = result?.data ?? null;
    invalidateServiciosCaches();
    return bloqueado;
};

export const eliminarDiaBloqueado = async (id) => {
    const result = await eliminarDiaBloqueadoFunction({ id });
    invalidateServiciosCaches();
    return result?.data ?? null;
};

export const bloquearHorario = async (fecha, motivo, horaInicio, horaFin) => {
    const result = await bloquearHorarioFunction({ fecha, motivo, horaInicio, horaFin });
    const bloqueo = result?.data ?? null;
    invalidateServiciosCaches();
    return bloqueo;
};

export const getBloqueosHorarios = async (anio, mes) => {
    const result = await getBloqueosHorariosFunction({ anio, mes });
    return Array.isArray(result?.data) ? result.data : [];
};

export const eliminarBloqueoHorario = async (id) => {
    const result = await eliminarBloqueosHorarioFunction({ id });
    invalidateServiciosCaches();
    return result?.data ?? null;
};
