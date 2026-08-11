import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    updateDoc,
    doc,
    deleteDoc,
    writeBatch,
    onSnapshot, getDocs,
    getDoc
} from "firebase/firestore";

import { db } from "../config/firebase";
import { actualizarRack } from "./rackService";

const COLLECTION = "rack_stock";

const normalizarTipo = (valor = "") => String(valor || "").toLowerCase().trim();

const obtenerCapacidadPorTipo = (rack = {}) => ({
    materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
    material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
    producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0)
});

const calcularPorcentajeMovimiento = (rack = {}, tipoItem = "", cantidad = 0) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    if (!capacidadMaxima || !cantidadNumerica) {
        return 0;
    }

    return Number(((cantidadNumerica / capacidadMaxima) * 100).toFixed(2));
};

export const actualizarOcupacionRack = async ({ rackId, rack, tipoItem = "", cantidad = 0, operacion = "sumar" }) => {
    if (!rackId || !rack) return;

    const porcentajeMovimiento = calcularPorcentajeMovimiento(rack, tipoItem, cantidad);

    if (!porcentajeMovimiento) return;

    const ocupacionActual = Number(rack?.espacioOcupado || 0);
    const ocupacionResultante = operacion === "restar"
        ? Math.max(0, ocupacionActual - porcentajeMovimiento)
        : Math.min(100, ocupacionActual + porcentajeMovimiento);

    await actualizarRack(rackId, {
        espacioOcupado: Number(ocupacionResultante.toFixed(2))
    });
};

export const actualizarOcupacionRackPorMovimientos = async ({ rackId, rack, movimientos = [], operacion = "sumar" }) => {
    if (!rackId || !rack) return;

    const totalesPorTipo = (movimientos || []).reduce((acc, mov) => {
        const tipo = normalizarTipo(mov?.tipoItem || "");

        if (!tipo) return acc;

        acc[tipo] = (acc[tipo] || 0) + Number(mov?.cantidad || 0);
        return acc;
    }, {});

    const porcentajeTotal = Object.entries(totalesPorTipo).reduce((acc, [tipo, cantidad]) => {
        const porcentaje = calcularPorcentajeMovimiento(rack, tipo, cantidad);
        return acc + porcentaje;
    }, 0);

    if (!porcentajeTotal) return;

    const ocupacionActual = Number(rack?.espacioOcupado || 0);
    const ocupacionResultante = operacion === "restar"
        ? Math.max(0, ocupacionActual - porcentajeTotal)
        : Math.min(100, ocupacionActual + porcentajeTotal);

    await actualizarRack(rackId, {
        espacioOcupado: Number(ocupacionResultante.toFixed(2))
    });
};

export const obtenerEstadoAsignacionRack = ({ rack, stockItems = [] }) => {
    const tipoAlmacenamiento = normalizarTipo(rack?.tipoAlmacenamiento);
    const stockActivo = (stockItems || []).filter(item => Number(item.cantidadActual || 0) > 0);

    if (stockActivo.length === 0) {
        if (tipoAlmacenamiento) {
            return tipoAlmacenamiento;
        }

        return rack?.tipoAsignacion || "";
    }

    const tiposLotes = [...new Set(stockActivo.map(item => normalizarTipo(item.tipoItem)))];

    if (tiposLotes.length === 0) {
        return tipoAlmacenamiento || rack?.tipoAsignacion || "";
    }

    const coincideTipo = tiposLotes.every(tipo => tipo === tipoAlmacenamiento);

    return coincideTipo ? "lote_en_uso" : "ubicacion_temporal";
};

export const actualizarAsignacionRackPorStock = async (rackId, rack, stockItems = []) => {
    if (!rackId) return;

    const estadoAsignacion = obtenerEstadoAsignacionRack({ rack, stockItems });

    if (!estadoAsignacion) return;

    await actualizarRack(rackId, {
        tipoAsignacion: estadoAsignacion
    });
};

/*
|--------------------------------------------------------------------------
| Crear stock
|--------------------------------------------------------------------------
*/

export const crearStock = async (data) => {

    const stockRef = await addDoc(
        collection(db, COLLECTION),
        {
            ...data,

            cantidadActual: Number(data.cantidadActual),

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            activo: true
        }
    );

    if (data?.rackId) {
        const rackSnap = await getDoc(doc(db, "racks", data.rackId));
        const rack = rackSnap.exists() ? { id: rackSnap.id, ...rackSnap.data() } : null;
        const stockActual = await obtenerStockPorRack(data.rackId);

        if (rack) {
            await actualizarOcupacionRack({
                rackId: data.rackId,
                rack,
                tipoItem: data.tipoItem,
                cantidad: Number(data.cantidadActual || 0),
                operacion: "sumar"
            });

            await actualizarAsignacionRackPorStock(
                data.rackId,
                rack,
                stockActual
            );
        }
    }

    return stockRef;
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

export const actualizarColorStockPorItem = async (itemId, color) => {
    if (!itemId) return;

    const q = query(
        collection(db, COLLECTION),
        where("itemId", "==", itemId),
        where("activo", "==", true)
    );

    const snap = await getDocs(q);

    if (snap.empty) return;

    const batch = writeBatch(db);

    snap.docs.forEach((docItem) => {
        batch.update(doc(db, COLLECTION, docItem.id), {
            color: color || null,
            updatedAt: serverTimestamp()
        });
    });

    await batch.commit();
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

    if (rackId) {
        const rackSnap = await getDoc(doc(db, "racks", rackId));
        const rack = rackSnap.exists() ? { id: rackSnap.id, ...rackSnap.data() } : null;
        const stockRestante = await obtenerStockPorRack(rackId);

        if (rack) {
            await actualizarOcupacionRackPorMovimientos({
                rackId,
                rack,
                movimientos,
                operacion: "restar"
            });

            await actualizarAsignacionRackPorStock(
                rackId,
                rack,
                stockRestante
            );
        }
    }

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

/*
|--------------------------------------------------------------------------
| Snapshot Stock por Rack
|--------------------------------------------------------------------------
*/

export const suscribirStockPorRack = (

    rackId,

    callback

) => {

    const q = query(

        collection(db, COLLECTION),

        where("rackId", "==", rackId),

        where("activo", "==", true)

    );

    return onSnapshot(q, (snapshot) => {

        const data = snapshot.docs.map(docItem => ({

            id: docItem.id,

            ...docItem.data()

        }));

        data.sort((a, b) => {

            const fechaA =
                a.createdAt?.seconds || 0;

            const fechaB =
                b.createdAt?.seconds || 0;

            return fechaA - fechaB;

        });

        callback(data);

    });

};


/*
|--------------------------------------------------------------------------
| Snapshot Todo el Stock
|--------------------------------------------------------------------------
*/

export const suscribirStock = (

    callback

) => {

    const q = query(

        collection(db, COLLECTION),

        where("activo", "==", true)

    );

    return onSnapshot(q, (snapshot) => {

        const stock = snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data()

        }));

        callback(stock);

    });

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