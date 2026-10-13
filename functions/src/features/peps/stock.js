const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  db,
  FieldValue,
  rackCollection,
  rackStockCollection,
  getPayload,
  validatePayload,
  formatStockData,
  obtenerFechaOrden,
  normalizarTipo,
  obtenerCapacidadPorTipo,
  obtenerStockPorRackDb,
  actualizarOcupacionRack,
  actualizarOcupacionRackPorMovimientos,
  actualizarAsignacionRackPorStock,
  normalizarTexto,
  normalizarCantidad,
} = require("./utils");

const obtenerEspacioDisponibleRack = ({ rack = {}, tipoItem = "", stockItems = [], cantidad = 0 }) => {
  const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
  const tipoNormalizado = normalizarTipo(tipoItem);
  const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
  const cantidadNumerica = Number(cantidad || 0);

  const porcentajeOcupadoActual = Object.entries(capacidadPorTipo).reduce((sum, [tipo, capacidad]) => {
    if (!Number(capacidad || 0)) return sum;

    const stockTipo = (stockItems || [])
      .filter((item) => normalizarTipo(item?.tipoItem) === normalizarTipo(tipo))
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
      : "",
  };
};

const validarCapacidadRack = ({ rack = {}, tipoItem = "", cantidad = 0, stockItems = [] }) => {
  const resumen = obtenerEspacioDisponibleRack({ rack, tipoItem, stockItems, cantidad });
  return { ...resumen, valido: !resumen.excedeCapacidad };
};

exports.refreshRackStockCaches = onCall(async (request) => {
  const rackId = request?.data?.rackId ?? null;
  const snap = await rackStockCollection.where("activo", "==", true).get();
  const stock = formatStockData(snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));

  if (rackId) {
    return {
      stock: stock.filter((item) => String(item.rackId) === String(rackId)),
    };
  }

  return { stock };
});

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
        stockItems: stockActual,
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
    activo: true,
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
        operacion: "sumar",
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
    updatedAt: FieldValue.serverTimestamp(),
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
  snap.docs.forEach((docItem) => {
    batch.update(rackStockCollection.doc(docItem.id), {
      color: color || null,
      updatedAt: FieldValue.serverTimestamp(),
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
    stock: formatStockData(snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))),
  };
});

const descontarStockPEPSLogic = async ({ rackId, itemId, cantidadSalida }) => {
  const cantidadSalidaNumerica = Number(cantidadSalida);

  if (!rackId || !itemId || !Number.isFinite(cantidadSalidaNumerica) || cantidadSalidaNumerica <= 0) {
    throw new HttpsError("invalid-argument", "Se requieren rackId, itemId y cantidadSalida válidos.");
  }

  const stock = await obtenerStockPorRackDb(rackId).then((items) => items
    .filter((item) => String(item.itemId) === String(itemId))
    .sort((a, b) => obtenerFechaOrden(a) - obtenerFechaOrden(b)));

  const totalDisponible = stock.reduce((acc, item) => acc + Number(item.cantidadActual || 0), 0);
  if (cantidadSalidaNumerica > totalDisponible) {
    throw new HttpsError("failed-precondition", "Stock insuficiente");
  }

  const batch = db.batch();
  let restante = cantidadSalidaNumerica;
  const movimientos = [];

  for (const item of stock) {
    if (restante <= 0) break;

    const disponible = Number(item.cantidadActual || 0);

    if (disponible > restante) {
      const nuevaCantidad = disponible - restante;
      batch.update(rackStockCollection.doc(item.id), {
        cantidadActual: nuevaCantidad,
        updatedAt: FieldValue.serverTimestamp(),
      });

      movimientos.push({
        stockId: item.id,
        lote: item.lote,
        cantidad: restante,
        unidad: item.unidad,
        nombreItem: item.nombreItem,
        tipoItem: item.tipoItem,
        color: item.color || item.color2 || null,
        color2: item.color2 || null,
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
        tipoItem: item.tipoItem,
        color: item.color || item.color2 || null,
        color2: item.color2 || null,
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
        operacion: "restar",
      });
      await actualizarAsignacionRackPorStock(rackId, rack, stockRestante);
    }
  }

  return { movimientos };
};

exports.descontarStockPEPS = onCall(async (request) => {
  const payload = getPayload(request);
  const { rackId, itemId, cantidadSalida } = payload || {};
  return descontarStockPEPSLogic({ rackId, itemId, cantidadSalida });
});

exports.trasladarStockPEPS = onCall(async (request) => {
  const payload = getPayload(request);

  const rackOrigenId = normalizarTexto(payload?.rackOrigen?.id ?? payload?.rackOrigen ?? "");
  const rackDestinoId = normalizarTexto(payload?.rackDestino?.id ?? payload?.rackDestino ?? "");
  const itemId = normalizarTexto(payload?.itemId ?? payload?.item?.id ?? "");
  const cantidad = normalizarCantidad(payload?.cantidad ?? payload?.cantidadSalida ?? 0);
  const usuario = payload?.usuario ?? null;

  const rackOrigen = typeof payload?.rackOrigen === "object" && payload?.rackOrigen && !Array.isArray(payload.rackOrigen)
    ? { ...payload.rackOrigen, id: rackOrigenId }
    : { id: rackOrigenId };
  const rackDestino = typeof payload?.rackDestino === "object" && payload?.rackDestino && !Array.isArray(payload.rackDestino)
    ? { ...payload.rackDestino, id: rackDestinoId }
    : { id: rackDestinoId };

  const invalidReasons = [];
  if (!rackOrigenId) invalidReasons.push("rackOrigen.id");
  if (!rackDestinoId) invalidReasons.push("rackDestino.id");
  if (!itemId) invalidReasons.push("itemId");
  if (!Number.isFinite(cantidad)) invalidReasons.push("cantidad (no es numérica)");
  if (Number.isFinite(cantidad) && cantidad <= 0) invalidReasons.push("cantidad (debe ser > 0)");

  if (invalidReasons.length > 0) {
    throw new HttpsError("invalid-argument", `Argumentos inválidos: ${invalidReasons.join(", ")}.`);
  }

  const stockDestino = await obtenerStockPorRackDb(rackDestinoId);
  const tipoItemDestino = (stockDestino || []).find((item) => String(item.itemId) === String(itemId))?.tipoItem || "";
  const validacionDestino = validarCapacidadRack({
    rack: rackDestino,
    tipoItem: tipoItemDestino || rackOrigen?.tipoAsignacion || "",
    cantidad,
    stockItems: stockDestino,
  });

  if (!validacionDestino.valido) {
    throw new HttpsError("failed-precondition", validacionDestino.mensaje || "No hay espacio suficiente en el rack destino para esta transferencia");
  }

  const result = await descontarStockPEPSLogic({ rackId: rackOrigenId, itemId, cantidadSalida: cantidad });
  const movimientos = result?.movimientos || [];

  for (const mov of movimientos) {
    await rackStockCollection.add({
      rackId: rackDestinoId,
      rackNumero: rackDestino.numeroRack,
      itemId,
      nombreItem: mov.nombreItem,
      tipoItem: mov.tipoItem,
      color: mov.color || mov.color2 || null,
      color2: mov.color2 || null,
      lote: mov.lote,
      cantidadActual: Number(mov.cantidad || 0),
      unidad: mov.unidad,
      fechaEntrada: new Date().toISOString().slice(0, 10),
      createdBy: {
        id: usuario?.id,
        nombre: usuario?.nombre,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      activo: true,
    });
  }

  const rackDestinoActual = await rackCollection.doc(rackDestinoId).get();
  const rackDestinoActualizado = rackDestinoActual.exists ? { id: rackDestinoActual.id, ...rackDestinoActual.data() } : null;

  if (rackDestinoActualizado) {
    const stockDestinoActual = await obtenerStockPorRackDb(rackDestinoId);
    await actualizarOcupacionRackPorMovimientos({
      rackId: rackDestinoId,
      rack: rackDestinoActualizado,
      movimientos,
      operacion: "sumar",
    });
    await actualizarAsignacionRackPorStock(rackDestinoId, rackDestinoActualizado, stockDestinoActual);
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
  const stock = formatStockData(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  return { stock };
});

exports.obtenerStockPorRack = onCall(async (request) => {
  const rackId = request?.data?.rackId;
  const stock = await obtenerStockPorRackDb(rackId);
  return { stock };
});