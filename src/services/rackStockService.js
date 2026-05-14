import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    updateDoc,
    doc,
    deleteDoc,
    writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";

const COLLECTION = "rack_stock";

/*
|--------------------------------------------------------------------------
| Crear stock
|--------------------------------------------------------------------------
*/

export const crearStock = async (data) => {

    return await addDoc(
        collection(db, COLLECTION),
        {
            ...data,

            cantidadActual: Number(data.cantidadActual),

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            activo: true
        }
    );
};

/*
|--------------------------------------------------------------------------
| Obtener stock por rack
|--------------------------------------------------------------------------
*/

export const obtenerStockPorRack = async (rackId) => {

    const q = query(
        collection(db, COLLECTION),

        where("rackId", "==", rackId),

        where("activo", "==", true)
    );

    const snap = await getDocs(q);

    const data = snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    }));

    return data.sort((a, b) => {

        const fechaA =
            a.createdAt?.seconds || 0;

        const fechaB =
            b.createdAt?.seconds || 0;

        return fechaA - fechaB;
    });
};
/*
|--------------------------------------------------------------------------
| Actualizar cantidad
|--------------------------------------------------------------------------
*/

export const actualizarCantidadStock = async (
    stockId,
    cantidadActual
) => {

    const ref = doc(db, COLLECTION, stockId);

    await updateDoc(ref, {
        cantidadActual: Number(cantidadActual),
        updatedAt: serverTimestamp()
    });
};

/*
|--------------------------------------------------------------------------
| Eliminar stock vacío
|--------------------------------------------------------------------------
*/

export const eliminarStock = async (stockId) => {

    const ref = doc(db, COLLECTION, stockId);

    await deleteDoc(ref);
};

/*
|--------------------------------------------------------------------------
| Obtener stock PEPS
|--------------------------------------------------------------------------
*/

export const obtenerStockPEPS = async (
    rackId,
    itemId
) => {

    const q = query(
        collection(db, COLLECTION),

        where("rackId", "==", rackId),
        where("itemId", "==", itemId),
        where("activo", "==", true),

        orderBy("fechaEntrada", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    }));
};


/*
|--------------------------------------------------------------------------
| Salida PEPS
|--------------------------------------------------------------------------
*/

export const descontarStockPEPS = async ({
    rackId,
    itemId,
    cantidadSalida
}) => {

    /*
    |--------------------------------------------------------------------------
    | Obtener stock ordenado PEPS
    |--------------------------------------------------------------------------
    */

    const stock =
        await obtenerStockPEPS(
            rackId,
            itemId
        );

    /*
    |--------------------------------------------------------------------------
    | Validar stock suficiente
    |--------------------------------------------------------------------------
    */

    const totalDisponible =
        stock.reduce(
            (acc, item) =>
                acc + Number(item.cantidadActual),
            0
        );

    if (
        Number(cantidadSalida)
        > totalDisponible
    ) {
        throw new Error(
            "Stock insuficiente"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Batch
    |--------------------------------------------------------------------------
    */

    const batch = writeBatch(db);

    let restante =
        Number(cantidadSalida);

    const movimientos = [];

    /*
    |--------------------------------------------------------------------------
    | Recorrer stock PEPS
    |--------------------------------------------------------------------------
    */

    for (const item of stock) {

        if (restante <= 0) break;

        const disponible =
            Number(item.cantidadActual);

        /*
        |--------------------------------------------------------------------------
        | Consumir parcial
        |--------------------------------------------------------------------------
        */

        if (disponible > restante) {

            const nuevaCantidad =
                disponible - restante;

            const ref = doc(
                db,
                COLLECTION,
                item.id
            );

            batch.update(ref, {
                cantidadActual:
                    nuevaCantidad,

                updatedAt:
                    serverTimestamp()
            });

            movimientos.push({
                stockId: item.id,
                lote: item.lote,
                cantidad: restante,
                unidad: item.unidad,
                nombreItem:
                    item.nombreItem,
                tipoItem:
                    item.tipoItem
            });

            restante = 0;
        }

        /*
        |--------------------------------------------------------------------------
        | Consumir completo
        |--------------------------------------------------------------------------
        */

        else {

            const ref = doc(
                db,
                COLLECTION,
                item.id
            );

            batch.delete(ref);

            movimientos.push({
                stockId: item.id,
                lote: item.lote,
                cantidad: disponible,
                unidad: item.unidad,
                nombreItem:
                    item.nombreItem,
                tipoItem:
                    item.tipoItem
            });

            restante -= disponible;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Ejecutar batch
    |--------------------------------------------------------------------------
    */

    await batch.commit();

    return movimientos;
};

/*
|--------------------------------------------------------------------------
| Traslado PEPS
|--------------------------------------------------------------------------
*/

export const trasladarStockPEPS = async ({

    rackOrigen,
    rackDestino,

    itemId,

    cantidad,

    usuario
}) => {

    /*
    |--------------------------------------------------------------------------
    | Descontar origen
    |--------------------------------------------------------------------------
    */

    const movimientos =
        await descontarStockPEPS({

            rackId: rackOrigen.id,

            itemId,

            cantidadSalida: cantidad
        });

    /*
    |--------------------------------------------------------------------------
    | Crear stock destino
    |--------------------------------------------------------------------------
    */

    for (const mov of movimientos) {

        await crearStock({

            rackId: rackDestino.id,

            rackNumero:
                rackDestino.numeroRack,

            itemId,

            nombreItem:
                mov.nombreItem,

            tipoItem:
                mov.tipoItem,

            lote:
                mov.lote,

            cantidadActual:
                mov.cantidad,

            unidad:
                mov.unidad,

            fechaEntrada:
                new Date()
                    .toISOString()
                    .slice(0, 10),

            createdBy: {

                id: usuario.id,

                nombre:
                    usuario.nombre
            }
        });
    }

    return movimientos;
};