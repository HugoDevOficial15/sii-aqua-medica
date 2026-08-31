import { db } from "../config/firebase";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";

import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const ref = collection(db, "movimientos");
const MOVIMIENTOS_CACHE_KEY = "sii-aqua-movimientos-cache";

const getRackMovementsCacheKey = (rackId) => `${MOVIMIENTOS_CACHE_KEY}:${String(rackId || "all")}`;

// 🔥 HISTORIAL
export const obtenerMovimientosPorRack = async (rackId) => {
    const cacheKey = getRackMovementsCacheKey(rackId);
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(
        ref,
        where("rackId", "==", rackId),
        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const movimientos = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    writeCachedData(cacheKey, movimientos);
    return movimientos;
};

/*
|--------------------------------------------------------------------------
| Registrar movimiento
|--------------------------------------------------------------------------
*/

export const registrarMovimiento = async (data) => {
    const result = await addDoc(
        ref,
        {
            ...data,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }
    );

    if (data?.rackId) {
        clearCachedData(getRackMovementsCacheKey(data.rackId));
    }

    clearCachedData(MOVIMIENTOS_CACHE_KEY);
    return result;
};

/*
|--------------------------------------------------------------------------
| Obtener movimientos por rango de fecha
|--------------------------------------------------------------------------
*/

export const obtenerMovimientosPorFecha = async (
    rackId,
    fechaInicio,
    fechaFin
) => {
    const cacheKey = `${getRackMovementsCacheKey(rackId)}:fecha`;
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(
        ref, (db, "movimientos"),

        where("rackId", "==", rackId),

        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const movimientos = snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    }));

    const filtered = movimientos.filter(mov => {

        const fecha = mov.fecha;

        return (
            fecha >= fechaInicio &&
            fecha <= fechaFin
        );
    });

    writeCachedData(cacheKey, filtered);
    return filtered;
};

/*
|--------------------------------------------------------------------------
| Snapshot de movimientos
|--------------------------------------------------------------------------
*/

export const suscribirMovimientos = (

    rackId,

    callback

) => {

    const q = query(

        ref, (db, "movimientos"),

        where("rackId", "==", rackId),

        orderBy("createdAt", "desc")

    );

    return onSnapshot(

        q,

        (snapshot) => {

            const movimientos = snapshot.docs.map(doc => ({

                id: doc.id,

                ...doc.data()

            }));

            writeCachedData(getRackMovementsCacheKey(rackId), movimientos);
            callback(movimientos);

        }

    );

};

export const vaciarRack = async (rackId, user) => {

    const stock = await obtenerStockPorRack(rackId);

    const operaciones = stock.map(item => {

        return addDoc(collection(db, "movimientos"), {

            rackId,

            itemId: item.itemId || null,

            nombreItem: item.nombre,

            tipoItem: item.tipoItem || "",

            lote: item.lote,

            cantidad: item.cantidad,

            tipoMovimiento: "salida",

            fecha: new Date(),

            userId: user.id,

            userNombre: user.nombre,

            createdAt: new Date()

        });

    });

    await Promise.all(operaciones);
    clearCachedData(getRackMovementsCacheKey(rackId));
    clearCachedData(MOVIMIENTOS_CACHE_KEY);

};