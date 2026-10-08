import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const call = (name) => {
    if (!functions || typeof httpsCallable !== "function") {
        throw new Error(`Firebase Functions no está inicializado para "${name}".`);
    }

    return httpsCallable(functions, name);
};

const obtenerMovimientosPorRackFunction = call("obtenerMovimientosPorRack");
const registrarMovimientoFunction = call("registrarMovimiento");
const obtenerMovimientosPorFechaFunction = call("obtenerMovimientosPorFecha");
const suscribirMovimientosFunction = call("suscribirMovimientos");
const vaciarRackFunction = call("vaciarRack");

const MOVIMIENTOS_CACHE_KEY = "sii-aqua-movimientos-cache";
const getRackMovementsCacheKey = (rackId) => `${MOVIMIENTOS_CACHE_KEY}:${String(rackId || "all")}`;

const normalizarMovimientos = (value = []) => Array.isArray(value) ? value : [];

export const obtenerMovimientosPorRack = async (rackId) => {
    const cacheKey = getRackMovementsCacheKey(rackId);
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const { data } = await obtenerMovimientosPorRackFunction({ rackId });
    const movimientos = normalizarMovimientos(data?.movimientos);

    writeCachedData(cacheKey, movimientos);
    return movimientos;
};

export const registrarMovimiento = async (data) => {
    const { data: result } = await registrarMovimientoFunction(data);

    if (data?.rackId) {
        clearCachedData(getRackMovementsCacheKey(data.rackId));
    }

    clearCachedData(MOVIMIENTOS_CACHE_KEY);
    return result;
};

export const obtenerMovimientosPorFecha = async (rackId, fechaInicio, fechaFin) => {
    const cacheKey = `${getRackMovementsCacheKey(rackId)}:fecha`;
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const { data } = await obtenerMovimientosPorFechaFunction({ rackId, fechaInicio, fechaFin });
    const movimientos = normalizarMovimientos(data?.movimientos);

    writeCachedData(cacheKey, movimientos);
    return movimientos;
};

export const suscribirMovimientos = (rackId, callback) => {
    const sync = async () => {
        const { data } = await suscribirMovimientosFunction({ rackId });
        const movimientos = normalizarMovimientos(data?.movimientos);

        writeCachedData(getRackMovementsCacheKey(rackId), movimientos);
        callback?.(movimientos);
    };

    sync();
    return () => {};
};

export const vaciarRack = async (rackId, user) => {
    const { data } = await vaciarRackFunction({ rackId, user });

    clearCachedData(getRackMovementsCacheKey(rackId));
    clearCachedData(MOVIMIENTOS_CACHE_KEY);
    return data;
};