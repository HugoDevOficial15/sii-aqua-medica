const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");


/* COLECCIONES PARA PEPS */
const materiaPrimaCollection = db.collection("materia_prima");
const materialAcondicionamientoCollection = db.collection("material_acondicionamiento");
const productoTerminadoCollection = db.collection("producto_terminado");
const rackCollection = db.collection("racks");
const movimientoRackCollection = db.collection("movimientos");
const rackStockCollection = db.collection("rack_stock");

const itemCollections = {
    materia_prima: materiaPrimaCollection,
    material_acondicionamiento: materialAcondicionamientoCollection,
    producto_terminado: productoTerminadoCollection,
};

/* LOGICA PARA AGREGAR MATERIALES */
const getPayload = (request) => request?.data ?? {};
const validatePayload = (payload, fieldName = "datos") => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new HttpsError("invalid-argument", `No se proporcionaron ${fieldName} válidos.`);
    }
    return payload;
};

/* LOGICA PARA AGREGAR RACKS */

const normalizeRackList = (racks) => {
    return[...(racks || []).sort((a,b) => {
        const rackA = Number(a?.numeroRack || 0);
        const rackB = Number(b?.numeroRack || 0);
        if (rackA !== rackB) return rackA - rackB;
        return String(a?.id || "").localeCompare(String(b?.id || ""));
    })];

};

/* LOGICA PARA OBTENER EL STOCK DEL RACK */

const formatStockData = (data = []) => {
    return [...(data || [])].sort((a, b) => {
        const fechaA = Number(a?.createdAt?.seconds || a?.fechaEntrada || 0);
        const fechaB = Number(b?.createdAt?.seconds || b?.fechaEntrada || 0);
        return fechaA - fechaB;
    });
};

const normalizarTipo = (valor = "") => String(valor || "").toLowerCase().trim();

const obtenerCapacidadPorTipo = (rack = {}) => ({
    materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
    material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
    producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0)
});

/*  FUNCTIONS PARA LA PAGINA DE AGREGAR MATERIAL  */ 
/* MATERIA PRIMA */
exports.crearMateriaPrima = onCall(async (request) => {
    const payload = validatePayload(getPayload(request), "datos de materia prima");

    const docRef = await materiaPrimaCollection.add({
        ...payload,
        fechaCreacion: FieldValue.serverTimestamp(),
    });

    return { id: docRef.id };
});

exports.obtenerMateriaPrima = onCall(async () => {
    const snap = await materiaPrimaCollection.orderBy("fechaCreacion", "asc").get();
    const materiaPrima = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { materiaPrima };
});

exports.actualizarMateriaPrima = onCall(async (request) => {
    const payload = getPayload(request);
    const { id, data } = payload;

    if (!id) {
        throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar la materia prima.");
    }

    validatePayload(data, "datos de materia prima");

    await materiaPrimaCollection.doc(id).update({
        ...data,
        fechaActualizacion: FieldValue.serverTimestamp(),
    });

    return { id };
});

exports.obtenerItemsPorTipo = onCall(async (request) => {
    const tipo = String(request?.data?.tipo ?? "").trim();

    if (!tipo) {
        return { items: [] };
    }

    const collectionRef = itemCollections[tipo];

    if (!collectionRef) {
        throw new HttpsError("invalid-argument", `El tipo de almacenamiento "${tipo}" no es válido.`);
    }

    const snap = await collectionRef.orderBy("fechaCreacion", "asc").get();

    return {
        items: snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })),
    };
});

/** MATERIAL DE ACONDICIONAMIENTO */

exports.crearAcondicionamiento = onCall(async (request) => {
    const payload = validatePayload(getPayload(request), "datos de material de acondicionamiento");

    const docRef = await materialAcondicionamientoCollection.add({
        ...payload,
        fechaCreacion: FieldValue.serverTimestamp(),
    });

    return { id: docRef.id };
});

exports.obtenerAcondicionamiento = onCall(async () => {
    const snap = await materialAcondicionamientoCollection.orderBy("fechaCreacion", "asc").get();
    const materialAcondicionamiento = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { materialAcondicionamiento };
});

exports.actualizarAcondicionamiento = onCall(async (request) => {
    const payload = getPayload(request);
    const { id, data } = payload;

    if (!id) {
        throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar el material de acondicionamiento.");
    }

    validatePayload(data, "datos de material de acondicionamiento");

    await materialAcondicionamientoCollection.doc(id).update({
        ...data,
        fechaActualizacion: FieldValue.serverTimestamp(),
    });

    return { id };
});

/** PRODUCTO TERMINADO */

exports.crearProducto = onCall(async (request) => {
    const payload = validatePayload(getPayload(request), "datos de producto terminado");

    const docRef = await productoTerminadoCollection.add({
        ...payload,
        fechaCreacion: FieldValue.serverTimestamp(),
    });

    return { id: docRef.id };
});

exports.obtenerProducto = onCall(async () => {
    const snap = await productoTerminadoCollection.orderBy("fechaCreacion", "asc").get();
    const productoTerminado = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { productoTerminado };
});

exports.actualizarProducto = onCall(async (request) => {
    const payload = getPayload(request);
    const { id, data } = payload;

    if (!id) {
        throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar el producto terminado.");
    }

    validatePayload(data, "datos de producto terminado");

    await productoTerminadoCollection.doc(id).update({
        ...data,
        fechaActualizacion: FieldValue.serverTimestamp(),
    });

    return { id };
});


/*  FUNCTIONS PARA LA PAGINA DE AGREGAR RACK  */ 

exports.crearRack = onCall(async (request) => {
    const datos = validatePayload(getPayload(request), "datos de rack");

    const docRef = await rackCollection.add({
        ...datos,
        fechaCreacion: FieldValue.serverTimestamp(),
    });

    return { id: docRef.id };
});

exports.actualizarRack = onCall(async (request) => {
    const payload = getPayload(request);
    const { id, data } = payload;

    if (!id) {
        throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar el rack.");
    }

    validatePayload(data, "datos de rack");

    await rackCollection.doc(id).update({
        ...data,
        fechaActualizacion: FieldValue.serverTimestamp(),
    });

    return { id };
});

exports.eliminarRack = onCall(async (request) => {
    const payload = getPayload(request);
    const { id } = payload;

    if (!id) {
        throw new HttpsError("invalid-argument", "Se requiere un ID válido para eliminar el rack.");
    }

    await rackCollection.doc(id).delete();

    return { id };
});

/* SNAPSHOT PARA RACKS */

exports.suscribirRacks = onCall(async () => {
    const snap = await rackCollection.orderBy("numeroRack", "asc").get();
    const racks = normalizeRackList(snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })));
    return { racks };
});

/* SNAPSHOT MOVIMIENTOS RACKS */

exports.suscribirMovimientos = onCall(async (request) => {
    const rackId = request?.data?.rackId;

    if (!rackId) {
        throw new HttpsError("invalid-argument", "Se requiere un rackId válido para consultar movimientos.");
    }

    const snap = await movimientoRackCollection
        .where("rackId", "==", rackId)
        .orderBy("createdAt", "desc")
        .get();

    const movimientos = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));

    return { movimientos };
});

exports.obtenerRacks = onCall(async () => {
    const snap = await rackCollection.orderBy("numeroRack", "asc").get();
    const racks = normalizeRackList(snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })));
    return { racks };
});


/* FUNCTIONS PARA OBTENER EL STOCK DEL RACK */

exports.refreshRackStockCaches = onCall(async (request) => {
    const rackId = request?.data?.rackId ?? null;
    const snap = await rackStockCollection.where("activo", "==", true).get();
    const stock = formatStockData(snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    })));

    if (rackId) {
        return {
            stock: stock.filter(item => String(item.rackId) === String(rackId))
        };
    }

    return { stock };
});

const obtenerStockPorRackDb = async (rackId) => {
    if (!rackId) return [];

    const snap = await rackStockCollection
        .where("rackId", "==", rackId)
        .where("activo", "==", true)
        .get();

    return formatStockData(snap.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
    })));
};

const obtenerEspacioDisponibleRack = ({ rack = {}, tipoItem = "", stockItems = [], cantidad = 0 }) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    const porcentajeOcupadoActual = Object.entries(capacidadPorTipo).reduce((sum, [tipo, capacidad]) => {
        if (!Number(capacidad || 0)) return sum;

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

const validarCapacidadRack = ({ rack = {}, tipoItem = "", cantidad = 0, stockItems = [] }) => {
    const resumen = obtenerEspacioDisponibleRack({ rack, tipoItem, stockItems, cantidad });
    return { ...resumen, valido: !resumen.excedeCapacidad };
};

const actualizarOcupacionRack = async ({ rackId, rack = {}, tipoItem = "", cantidad = 0, operacion = "sumar" }) => {
    if (!rackId || !rack || !tipoItem) return;

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

    await rackCollection.doc(rackId).update({
        espacioOcupado: Number(ocupacionResultante.toFixed(2)),
        fechaActualizacion: FieldValue.serverTimestamp()
    });
};

const actualizarOcupacionRackPorMovimientos = async ({ rackId, rack = {}, movimientos = [], operacion = "sumar" }) => {
    if (!rackId || !rack || !Array.isArray(movimientos) || !movimientos.length) return;

    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const porcentajeTotal = movimientos.reduce((sum, mov) => {
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

    await rackCollection.doc(rackId).update({
        espacioOcupado: Number(ocupacionResultante.toFixed(2)),
        fechaActualizacion: FieldValue.serverTimestamp()
    });
};

const obtenerEstadoAsignacionRack = ({ rack, stockItems = [] }) => {
    const tipoAlmacenamiento = normalizarTipo(rack?.tipoAlmacenamiento);
    const stockActivo = (stockItems || []).filter(item => Number(item.cantidadActual || 0) > 0);

    if (stockActivo.length === 0) {
        return tipoAlmacenamiento || rack?.tipoAsignacion || "";
    }

    const tiposLotes = [...new Set(stockActivo.map(item => normalizarTipo(item.tipoItem)))];

    if (tiposLotes.length === 0) {
        return tipoAlmacenamiento || rack?.tipoAsignacion || "";
    }

    const coincideTipo = tiposLotes.every(tipo => tipo === tipoAlmacenamiento);
    return coincideTipo ? "lote_en_uso" : "ubicacion_temporal";
};

const actualizarAsignacionRackPorStock = async (rackId, rack, stockItems = []) => {
    if (!rackId) return;

    const estadoAsignacion = obtenerEstadoAsignacionRack({ rack, stockItems });
    if (!estadoAsignacion) return;

    await rackCollection.doc(rackId).update({
        tipoAsignacion: estadoAsignacion,
        fechaActualizacion: FieldValue.serverTimestamp()
    });
};

exports.crearStock = onCall(async (request) => {
    const data = validatePayload(getPayload(request), "datos de stock");

    if (data?.rackId && data?.tipoItem && Number(data?.cantidadActual || 0) > 0) {
        const rackSnap = await rackCollection.doc(data.rackId).get();
        const rack = rackSnap.exists ? { id: rackSnap.id, ...rackSnap.data() } : null;

        if (rack) {
            const stockActual = await obtenerStockPorRackDb(data.rackId);
            const validacion = validarCapacidadRack({
                rack,
                tipoItem: data.tipoItem,
                cantidad: Number(data.cantidadActual || 0),
                stockItems: stockActual
            });

            if (!validacion.valido) {
                throw new HttpsError("failed-precondition", validacion.mensaje || "No hay espacio suficiente en el rack para esta entrada");
            }
        }
    }

    const stockRef = await rackStockCollection.add({
        ...data,
        cantidadActual: Number(data.cantidadActual || 0),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        activo: true
    });

    if (data?.rackId) {
        const rackSnap = await rackCollection.doc(data.rackId).get();
        const rack = rackSnap.exists ? { id: rackSnap.id, ...rackSnap.data() } : null;
        const stockActual = await obtenerStockPorRackDb(data.rackId);

        if (rack) {
            await actualizarOcupacionRack({
                rackId: data.rackId,
                rack,
                tipoItem: data.tipoItem,
                cantidad: Number(data.cantidadActual || 0),
                operacion: "sumar"
            });

            await actualizarAsignacionRackPorStock(data.rackId, rack, stockActual);
        }
    }

    return { id: stockRef.id, rackId: data?.rackId || null };
});

exports.actualizarCantidadStock = onCall(async (request) => {
    const payload = getPayload(request);
    const { stockId, cantidadActual } = payload || {};

    if (!stockId) {
        throw new HttpsError("invalid-argument", "Se requiere un stockId válido.");
    }

    const ref = await rackStockCollection.doc(stockId).get();
    if (!ref.exists) {
        throw new HttpsError("not-found", "No se encontró el stock solicitado.");
    }

    const rackId = ref.data()?.rackId || null;
    await rackStockCollection.doc(stockId).update({
        cantidadActual: Number(cantidadActual || 0),
        updatedAt: FieldValue.serverTimestamp()
    });

    return { id: stockId, rackId };
});

exports.eliminarStock = onCall(async (request) => {
    const payload = getPayload(request);
    const { stockId } = payload || {};

    if (!stockId) {
        throw new HttpsError("invalid-argument", "Se requiere un stockId válido.");
    }

    const ref = await rackStockCollection.doc(stockId).get();
    const rackId = ref.exists ? ref.data()?.rackId || null : null;

    await rackStockCollection.doc(stockId).delete();
    return { id: stockId, rackId };
});

exports.actualizarColorStockPorItem = onCall(async (request) => {
    const payload = getPayload(request);
    const { itemId, color } = payload || {};

    if (!itemId) {
        return { updated: 0 };
    }

    const snap = await rackStockCollection
        .where("itemId", "==", itemId)
        .where("activo", "==", true)
        .get();

    if (snap.empty) {
        return { updated: 0 };
    }

    const batch = db.batch();
    snap.docs.forEach(docItem => {
        batch.update(rackStockCollection.doc(docItem.id), {
            color: color || null,
            updatedAt: FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    return { updated: snap.docs.length };
});

exports.obtenerStockPEPS = onCall(async (request) => {
    const payload = getPayload(request);
    const { rackId, itemId } = payload || {};

    if (!rackId || !itemId) {
        throw new HttpsError("invalid-argument", "Se requieren rackId e itemId válidos.");
    }

    const snap = await rackStockCollection
        .where("rackId", "==", rackId)
        .where("itemId", "==", itemId)
        .where("activo", "==", true)
        .orderBy("fechaEntrada", "asc")
        .get();

    return {
        stock: formatStockData(snap.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })))
    };
});

exports.descontarStockPEPS = onCall(async (request) => {
    const payload = getPayload(request);
    const { rackId, itemId, cantidadSalida } = payload || {};

    if (!rackId || !itemId) {
        throw new HttpsError("invalid-argument", "Se requieren rackId e itemId válidos.");
    }

    const stock = await obtenerStockPorRackDb(rackId)
        .then(items => items.filter(item => String(item.itemId) === String(itemId)));

    const totalDisponible = stock.reduce((acc, item) => acc + Number(item.cantidadActual || 0), 0);
    if (Number(cantidadSalida || 0) > totalDisponible) {
        throw new HttpsError("failed-precondition", "Stock insuficiente");
    }

    const batch = db.batch();
    let restante = Number(cantidadSalida || 0);
    const movimientos = [];

    for (const item of stock) {
        if (restante <= 0) break;

        const disponible = Number(item.cantidadActual || 0);

        if (disponible > restante) {
            const nuevaCantidad = disponible - restante;
            batch.update(rackStockCollection.doc(item.id), {
                cantidadActual: nuevaCantidad,
                updatedAt: FieldValue.serverTimestamp()
            });

            movimientos.push({
                stockId: item.id,
                lote: item.lote,
                cantidad: restante,
                unidad: item.unidad,
                nombreItem: item.nombreItem,
                tipoItem: item.tipoItem
            });

            restante = 0;
        } else {
            batch.delete(rackStockCollection.doc(item.id));
            movimientos.push({
                stockId: item.id,
                lote: item.lote,
                cantidad: disponible,
                unidad: item.unidad,
                nombreItem: item.nombreItem,
                tipoItem: item.tipoItem
            });
            restante -= disponible;
        }
    }

    await batch.commit();

    if (rackId) {
        const rackSnap = await rackCollection.doc(rackId).get();
        const rack = rackSnap.exists ? { id: rackSnap.id, ...rackSnap.data() } : null;
        const stockRestante = await obtenerStockPorRackDb(rackId);

        if (rack) {
            await actualizarOcupacionRackPorMovimientos({
                rackId,
                rack,
                movimientos,
                operacion: "restar"
            });
            await actualizarAsignacionRackPorStock(rackId, rack, stockRestante);
        }
    }

    return { movimientos };
});

exports.trasladarStockPEPS = onCall(async (request) => {
    const payload = getPayload(request);
    const { rackOrigen, rackDestino, itemId, cantidad, usuario } = payload || {};

    if (!rackOrigen?.id || !rackDestino?.id || !itemId || !cantidad) {
        throw new HttpsError("invalid-argument", "Faltan datos para transferir el stock.");
    }

    const stockDestino = await obtenerStockPorRackDb(rackDestino.id);
    const tipoItemDestino = (stockDestino || []).find(item => item.itemId === itemId)?.tipoItem || "";
    const validacionDestino = validarCapacidadRack({
        rack: rackDestino,
        tipoItem: tipoItemDestino || rackOrigen?.tipoAsignacion || "",
        cantidad,
        stockItems: stockDestino
    });

    if (!validacionDestino.valido) {
        throw new HttpsError("failed-precondition", validacionDestino.mensaje || "No hay espacio suficiente en el rack destino para esta transferencia");
    }

    const result = await exports.descontarStockPEPS({ data: { rackId: rackOrigen.id, itemId, cantidadSalida: cantidad } });
    const movimientos = result?.movimientos || [];

    for (const mov of movimientos) {
        await rackStockCollection.add({
            rackId: rackDestino.id,
            rackNumero: rackDestino.numeroRack,
            itemId,
            nombreItem: mov.nombreItem,
            tipoItem: mov.tipoItem,
            lote: mov.lote,
            cantidadActual: Number(mov.cantidad || 0),
            unidad: mov.unidad,
            fechaEntrada: new Date().toISOString().slice(0, 10),
            createdBy: {
                id: usuario?.id,
                nombre: usuario?.nombre
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            activo: true
        });
    }

    return { movimientos };
});

exports.suscribirStockPorRack = onCall(async (request) => {
    const rackId = request?.data?.rackId;
    const stock = await obtenerStockPorRackDb(rackId);
    return { stock };
});

exports.suscribirStock = onCall(async () => {
    const snap = await rackStockCollection.where("activo", "==", true).get();
    const stock = formatStockData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    return { stock };
});

exports.obtenerStockPorRack = onCall(async (request) => {
    const rackId = request?.data?.rackId;
    const stock = await obtenerStockPorRackDb(rackId);
    return { stock };
});