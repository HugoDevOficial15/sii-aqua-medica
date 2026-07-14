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

const ref = collection(db, "movimientos");


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


/*
|--------------------------------------------------------------------------
| Registrar movimiento
|--------------------------------------------------------------------------
*/

export const registrarMovimiento = async (data) => {

    return await addDoc(
        // collection(db, "movimientos"),
        ref,
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
        ref, (db, "movimientos"),

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

};