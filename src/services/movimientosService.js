import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

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

const normalizarMovimientos = (value = []) => Array.isArray(value) ? value : [];

export const obtenerMovimientosPorRack = async (rackId) => {
    const { data } = await obtenerMovimientosPorRackFunction({ rackId });
    return normalizarMovimientos(data?.movimientos);
};

export const registrarMovimiento = async (data) => {
    const { data: result } = await registrarMovimientoFunction(data);
    return result;
};

export const obtenerMovimientosPorFecha = async (rackId, fechaInicio, fechaFin) => {
    const { data } = await obtenerMovimientosPorFechaFunction({ rackId, fechaInicio, fechaFin });
    return normalizarMovimientos(data?.movimientos);
};

export const suscribirMovimientos = (rackId, callback) => {
    const sync = async () => {
        const { data } = await suscribirMovimientosFunction({ rackId });
        const movimientos = normalizarMovimientos(data?.movimientos);
        callback?.(movimientos);
    };

    sync();
    return () => {};
};

export const vaciarRack = async (rackId, user) => {
    const { data } = await vaciarRackFunction({ rackId, user });
    return data;
};