import { db } from "../config/firebase";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from "firebase/firestore";

const ref = collection(db, "movimientos");

// 🔥 ENTRADA
export const registrarEntrada = async (data) => {
    return await addDoc(ref, {
        ...data,
        tipoMovimiento: "entrada",
        createdAt: new Date()
    });
};

// 🔥 SALIDA (para después FIFO)
export const registrarSalida = async (data) => {
    return await addDoc(ref, {
        ...data,
        tipoMovimiento: "salida",
        createdAt: new Date()
    });
};

// 🔥 HISTORIAL
export const obtenerMovimientosPorRack = async (rackId) => {

    const q = query(
        ref,
        where("rackId", "==", rackId),
        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// 🔥 STOCK POR RACK (PEPS BASE)
export const obtenerStockPorRack = async (rackId) => {

    const q = query(
        ref,
        where("rackId", "==", rackId),
        orderBy("fecha", "asc")
    );

    const snap = await getDocs(q);

    const movimientos = snap.docs.map(d => d.data());

    const stock = {};

    movimientos.forEach(m => {

        const key = `${m.itemId}_${m.lote}`;

        if (!stock[key]) {
            stock[key] = {
                nombre: m.nombreItem,
                lote: m.lote,
                fecha: m.fecha,
                cantidad: 0
            };
        }

        if (m.tipoMovimiento === "entrada") {
            stock[key].cantidad += m.cantidad;
        } else {
            stock[key].cantidad -= m.cantidad;
        }
    });

    return Object.values(stock).filter(s => s.cantidad > 0);
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
};

/*
|--------------------------------------------------------------------------
| Registrar movimiento
|--------------------------------------------------------------------------
*/

export const registrarMovimiento = async (data) => {

    return await addDoc(
        collection(db, "movimientos"),
        {
            ...data,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }
    );
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

    const q = query(
        collection(db, "movimientos"),

        where("rackId", "==", rackId),

        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const movimientos = snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    }));

    return movimientos.filter(mov => {

        const fecha = mov.fecha;

        return (
            fecha >= fechaInicio &&
            fecha <= fechaFin
        );
    });
};