import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const crearRackFunction = call("crearRack");
const actualizarRackFunction = call("actualizarRack");
const eliminarRackFunction = call("eliminarRack");
const obtenerRacksFunction = call("obtenerRacks");
const suscribirRacksFunction = call("suscribirRacks");
const suscribirMovimientosFunction = call("suscribirMovimientos");
const lockRackFunction = call("lockRack");
const obtenerItemsPorTipoFunction = call("obtenerItemsPorTipo");

export const obtenerItemsPorTipo = async (tipo) => {
    if (!tipo) {
        return [];
    }

    try {
        const result = await obtenerItemsPorTipoFunction({ tipo });
        return Array.isArray(result?.data?.items) ? result.data.items : [];
    } catch (error) {
        console.error("Error al obtener items por tipo:", error);
        return [];
    }
};

const RACKS_CACHE_KEY = "sii-aqua-racks-cache";

export const crearRack = async (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Se requieren datos válidos para crear el rack.");
    }

    const result = await crearRackFunction(data);
    clearCachedData(RACKS_CACHE_KEY);
    return result?.data ?? null;
};

export const actualizarRack = async (id, data) => {
    if (!id) {
        throw new Error("Se requiere un ID válido para actualizar el rack.");
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Se requieren datos válidos para actualizar el rack.");
    }

    const result = await actualizarRackFunction({ id, data });
    clearCachedData(RACKS_CACHE_KEY);
    return result?.data ?? null;
};

export const eliminarRack = async (id) => {
    if (!id) {
        throw new Error("Se requiere un ID válido para eliminar el rack.");
    }

    const result = await eliminarRackFunction({ id });
    clearCachedData(RACKS_CACHE_KEY);
    return result?.data ?? null;
};

/*
|--------------------------------------------------------------------------
| SNAPSHOT RACKS
|--------------------------------------------------------------------------
*/

export const suscribirRacks = (callback) => {
    let isActive = true;

    suscribirRacksFunction()
        .then((result) => {
            if (!isActive) return;

            const racks = Array.isArray(result?.data?.racks) ? result.data.racks : [];
            writeCachedData(RACKS_CACHE_KEY, racks);
            callback?.(racks);
        })
        .catch((error) => {
            console.error("Error al suscribir racks:", error);
            callback?.([]);
        });

    return () => {
        isActive = false;
    };
};

/*
|--------------------------------------------------------------------------
| Snapshot movimientos
|--------------------------------------------------------------------------
*/

export const suscribirMovimientos = (rackId, callback) => {
    let isActive = true;

    suscribirMovimientosFunction({ rackId })
        .then((result) => {
            if (!isActive) return;
            const movimientos = Array.isArray(result?.data?.movimientos) ? result.data.movimientos : [];
            callback?.(movimientos);
        })
        .catch((error) => {
            console.error("Error al suscribir movimientos:", error);
            callback?.([]);
        });

    return () => {
        isActive = false;
    };
};

/*
|--------------------------------------------------------------------------
| BLOQUEAR RACK
|--------------------------------------------------------------------------
*/

export const bloquearRack = async (

    rackId,

    usuario

) => {

    const result = await lockRackFunction({

        action: "lock",

        rackId,

        user: {

            id: usuario.id,

            nombre: usuario.nombre

        }

    });

    return result.data;

};

/*
|--------------------------------------------------------------------------
| LIBERAR RACK
|--------------------------------------------------------------------------
*/

export const liberarRack = async (

    rackId

) => {

    const result = await lockRackFunction({

        action: "unlock",

        rackId

    });

    return result.data;

};

export const obtenerRacks = async () => {
    const cached = readCachedData(RACKS_CACHE_KEY);
    if (cached) {
        return cached;
    }

    const result = await obtenerRacksFunction();
    const racks = Array.isArray(result?.data?.racks) ? result.data.racks : [];

    writeCachedData(RACKS_CACHE_KEY, racks);
    return racks;
};