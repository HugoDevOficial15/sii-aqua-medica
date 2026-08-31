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
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";
import { actualizarRack } from "./rackService";

const COLLECTION = "rack_stock";
const RACK_STOCK_CACHE_KEY = "sii-aqua-rack-stock-cache";

const getRackStockCacheKey = (rackId) =>
    rackId ? `${RACK_STOCK_CACHE_KEY}:${String(rackId)}` : RACK_STOCK_CACHE_KEY;

const formatStockData = (data = []) => {
    return [...(data || [])].sort((a, b) => {
        const fechaA = Number(a?.createdAt?.seconds || a?.fechaEntrada || 0);
        const fechaB = Number(b?.createdAt?.seconds || b?.fechaEntrada || 0);
        return fechaA - fechaB;
    });
};

const refreshRackStockCaches = async (rackId = null) => {
    const snap = await getDocs(query(
        collection(db, COLLECTION),
        where("activo", "==", true)
    ));

    const stock = formatStockData(snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    })));

    writeCachedData(RACK_STOCK_CACHE_KEY, stock);

    if (rackId) {
        const rackStock = stock.filter(item => String(item.rackId) === String(rackId));
        writeCachedData(getRackStockCacheKey(rackId), rackStock);
    }

    return stock;
};
const normalizarTipo = (valor = "") => String(valor || "").toLowerCase().trim();

const obtenerCapacidadPorTipo = (rack = {}) => ({
    materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
    material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
    producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0)
});

const obtenerCapacidadTotalRack = (rack = {}) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    return Object.values(capacidadPorTipo).reduce((sum, valor) => sum + Number(valor || 0), 0);
};

export const obtenerEspacioDisponibleRack = ({ rack = {}, tipoItem = "", stockItems = [], cantidad = 0 }) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    const porcentajeOcupadoActual = Object.entries(capacidadPorTipo).reduce((sum, [tipo, capacidad]) => {
        if (!Number(capacidad || 0)) {
            return sum;
        }

        const stockTipo = (stockItems || [])
            .filter(item => normalizarTipo(item?.tipoItem) === normalizarTipo(tipo))
            .reduce((total, item) => total + Number(item?.cantidadActual || 0), 0);

        return sum + ((stockTipo / Number(capacidad)) * 100);
    }, 0);

    const porcentajeSolicitud = capacidadMaxima > 0 ? ((cantidadNumerica / capacidadMaxima) * 100) : 0;
    const porcentajeTotalFinal = porcentajeOcupadoActual + porcentajeSolicitud;
    const espacioLibre = capacidadMaxima > 0 ? Math.max(0, capacidadMaxima * (1 - (porcentajeOcupadoActual / 100))) : 0;
    const excedeCapacidad = capacidadMaxima > 0 && porcentajeTotalFinal > 100 + Number.EPSILON;

    return {
        tipo: tipoNormalizado,
        capacidadMaxima,
        stockActual: (stockItems || []).reduce((sum, item) => sum + Number(item?.cantidadActual || 0), 0),
        cantidadSolicitada: cantidadNumerica,
        espacioLibre,
        porcentajeActual: Number(porcentajeOcupadoActual.toFixed(2)),
        porcentajeTotal: Number((porcentajeTotalFinal).toFixed(2)),
        excedeCapacidad,
        mensaje: excedeCapacidad
            ? `No hay espacio suficiente en el rack. Se dispone de ${espacioLibre.toFixed()} unidades libres para ${tipoNormalizado.replace(/_/g, " ")}.`
            : ""
    };
};

export const validarCapacidadRack = ({ rack = {}, tipoItem = "", cantidad = 0, stockItems = [] }) => {
    const resumen = obtenerEspacioDisponibleRack({
        rack,
        tipoItem,
        stockItems,
        cantidad
    });

    return {
        ...resumen,
        valido: !resumen.excedeCapacidad
    };
};

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

    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    if (!capacidadMaxima || !cantidadNumerica) return;

    const porcentajeMovimiento = Number(((cantidadNumerica / capacidadMaxima) * 100).toFixed(2));
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

    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const porcentajeTotal = (movimientos || []).reduce((sum, mov) => {
        const tipo = normalizarTipo(mov?.tipoItem || "");
        const capacidad = Number(capacidadPorTipo[tipo] || 0);
        const cantidad = Number(mov?.cantidad || 0);

        if (!capacidad || !cantidad) return sum;

        return sum + ((cantidad / capacidad) * 100);
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
    if (data?.rackId && data?.tipoItem && Number(data?.cantidadActual || 0) > 0) {
        const rackSnap = await getDoc(doc(db, "racks", data.rackId));
        const rack = rackSnap.exists() ? { id: rackSnap.id, ...rackSnap.data() } : null;

        if (rack) {
            const stockActual = await obtenerStockPorRack(data.rackId);
            const validacion = validarCapacidadRack({
                rack,
                tipoItem: data.tipoItem,
                cantidad: Number(data.cantidadActual || 0),
                stockItems: stockActual
            });

            if (!validacion.valido) {
                throw new Error(validacion.mensaje || "No hay espacio suficiente en el rack para esta entrada");
            }
        }
    }

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

    await refreshRackStockCaches(data?.rackId || null);
    clearCachedData(getRackStockCacheKey(data?.rackId || "all"));
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
    const currentSnap = await getDoc(ref);
    const rackId = currentSnap.exists() ? currentSnap.data()?.rackId : null;

    await updateDoc(ref, {
        cantidadActual: Number(cantidadActual),
        updatedAt: serverTimestamp()
    });

    await refreshRackStockCaches(rackId || null);
    clearCachedData(getRackStockCacheKey(rackId || "all"));
};

/*
|--------------------------------------------------------------------------
| Eliminar stock vacío
|--------------------------------------------------------------------------
*/

export const eliminarStock = async (stockId) => {

    const ref = doc(db, COLLECTION, stockId);
    const currentSnap = await getDoc(ref);
    const rackId = currentSnap.exists() ? currentSnap.data()?.rackId : null;

    await deleteDoc(ref);
    await refreshRackStockCaches(rackId || null);
    clearCachedData(getRackStockCacheKey(rackId || "all"));
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
    const cacheKey = `${RACK_STOCK_CACHE_KEY}:peps:${String(rackId || "all")}:${String(itemId || "all")}`;
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(
        collection(db, COLLECTION),

        where("rackId", "==", rackId),
        where("itemId", "==", itemId),
        where("activo", "==", true),

        orderBy("fechaEntrada", "asc")
    );

    const snap = await getDocs(q);
    const stock = snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    }));

    writeCachedData(cacheKey, stock);
    return stock;
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
    const stockDestino = await obtenerStockPorRack(rackDestino.id);
    const tipoItemDestino = (stockDestino || []).find(item => item.itemId === itemId)?.tipoItem || "";
    const validacionDestino = validarCapacidadRack({
        rack: rackDestino,
        tipoItem: tipoItemDestino || rackOrigen?.tipoAsignacion || "",
        cantidad,
        stockItems: stockDestino
    });

    if (!validacionDestino.valido) {
        throw new Error(validacionDestino.mensaje || "No hay espacio suficiente en el rack destino para esta transferencia");
    }

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

        const data = formatStockData(snapshot.docs.map(docItem => ({

            id: docItem.id,

            ...docItem.data()

        })));

        writeCachedData(getRackStockCacheKey(rackId), data);
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

        const stock = formatStockData(snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data()

        })));

        writeCachedData(RACK_STOCK_CACHE_KEY, stock);
        callback(stock);

    });

};


/*
|--------------------------------------------------------------------------
| Obtener stock por rack
|--------------------------------------------------------------------------
*/

export const obtenerStockPorRack = async (rackId) => {
    const cacheKey = getRackStockCacheKey(rackId);
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(
        collection(db, COLLECTION),

        where("rackId", "==", rackId),

        where("activo", "==", true)
    );

    const snap = await getDocs(q);

    const data = formatStockData(snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    })));

    writeCachedData(cacheKey, data);
    return data;

};