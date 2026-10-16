const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  db,
  FieldValue,
  rackCollection,
  movimientoRackCollection,
  getPayload,
  validatePayload,
  normalizeRackList,
} = require("./utils");


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

exports.suscribirRacks = onCall(async () => {
  const snap = await rackCollection.orderBy("numeroRack", "asc").get();
  const racks = normalizeRackList(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  return { racks };
});

exports.obtenerRacks = onCall(async () => {
  const snap = await rackCollection.orderBy("numeroRack", "asc").get();
  const racks = normalizeRackList(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  return { racks };
});

exports.obtenerMovimientosPorRack = onCall(async (request) => {
  const rackId = request?.data?.rackId;
  const movimientos = await movimientoRackCollection.where("rackId", "==", rackId).get();
  return { movimientos };
});

const sanitizarCamposIndefinidos = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizarCamposIndefinidos(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const limpio = {};

    Object.entries(value).forEach(([key, item]) => {
      const normalizado = sanitizarCamposIndefinidos(item);
      if (normalizado !== undefined) {
        limpio[key] = normalizado;
      }
    });

    return limpio;
  }

  return value;
};

const normalizarFechaMovimiento = (valor) => {
  if (valor === undefined || valor === null || valor === "") {
    throw new HttpsError("invalid-argument", "La fecha del movimiento es obligatoria.");
  }

  if (typeof valor === "string") {
    const fecha = valor.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new HttpsError("invalid-argument", "La fecha del movimiento debe estar en formato YYYY-MM-DD.");
    }
    return fecha;
  }

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new HttpsError("invalid-argument", "La fecha del movimiento es inválida.");
    }
    return valor.toISOString().slice(0, 10);
  }

  if (valor && typeof valor.toDate === "function") {
    const fecha = valor.toDate();
    if (Number.isNaN(fecha.getTime())) {
      throw new HttpsError("invalid-argument", "La fecha del movimiento es inválida.");
    }
    return fecha.toISOString().slice(0, 10);
  }

  throw new HttpsError("invalid-argument", "La fecha del movimiento tiene un formato inválido.");
};

const normalizarCantidadMovimiento = (valor) => {
  const cantidad = Number(valor);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new HttpsError("invalid-argument", "La cantidad del movimiento debe ser un número mayor a 0.");
  }

  return cantidad;
};

const registrarMovimientoCore = async (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Se requieren datos válidos para registrar el movimiento.");
  }

  const payload = sanitizarCamposIndefinidos(data);

  const rackId = payload?.rackId;
  const itemId = payload?.itemId;
  const tipoMovimiento = payload?.tipoMovimiento;
  const fecha = payload?.fecha;
  const cantidad = payload?.cantidad;

  if (!rackId || String(rackId).trim() === "") {
    throw new HttpsError("invalid-argument", "Se requiere un rackId válido para registrar el movimiento.");
  }

  if (!itemId || String(itemId).trim() === "") {
    throw new HttpsError("invalid-argument", "Se requiere un itemId válido para registrar el movimiento.");
  }

  if (!tipoMovimiento || String(tipoMovimiento).trim() === "") {
    throw new HttpsError("invalid-argument", "Se requiere un tipo de movimiento válido.");
  }

  const cantidadNormalizada = normalizarCantidadMovimiento(cantidad);
  const fechaNormalizada = normalizarFechaMovimiento(fecha);

  const payloadLimpio = {
    ...payload,
    rackId: String(rackId).trim(),
    itemId: String(itemId).trim(),
    tipoMovimiento: String(tipoMovimiento).trim(),
    fecha: fechaNormalizada,
    cantidad: cantidadNormalizada,
  };

  const docRef = await movimientoRackCollection.add({
    ...payloadLimpio,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    activo: true,
  });

  return { id: docRef.id };
};

exports.registrarMovimiento = onCall(async (request) => {
  const data = request?.data ?? {};
  const result = await registrarMovimientoCore(data);
  return result;
});

const normalizarFechaConsulta = (valor, nombreCampo) => {
  if (valor === undefined || valor === null || valor === "") {
    throw new HttpsError("invalid-argument", `Se requiere una ${nombreCampo} válida.`);
  }

  const fecha = String(valor).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new HttpsError("invalid-argument", `La ${nombreCampo} debe estar en formato YYYY-MM-DD.`);
  }

  return fecha;
};

const obtenerMovimientosPorFechaCore = async (data = {}) => {
  const rackId = data?.rackId;
  const fechaInicio = normalizarFechaConsulta(data?.fechaInicio, "fecha de inicio");
  const fechaFin = normalizarFechaConsulta(data?.fechaFin, "fecha final");

  if (fechaFin < fechaInicio) {
    throw new HttpsError("invalid-argument", "La fecha final no puede ser menor que la fecha de inicio.");
  }

  const snap = await movimientoRackCollection
    .where("rackId", "==", rackId)
    .where("fecha", ">=", fechaInicio)
    .where("fecha", "<=", fechaFin)
    .orderBy("fecha", "desc")
    .get();

  const movimientos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { movimientos };
};

exports.obtenerMovimientosPorFecha = onCall(async (request) => {
  const data = request?.data ?? {};
  return obtenerMovimientosPorFechaCore(data);
});

exports.suscribirMovimientos = onCall(async (request) => {
  const rackId = request?.data?.rackId;
  const snap = await movimientoRackCollection
    .where("rackId", "==", rackId)
    .orderBy("createdAt", "desc")
    .get();
  const movimientos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { movimientos };
});

exports.vaciarRack = onCall(async (request) => {
  const rackId = request?.data?.rackId;
  const user = request?.data?.user;
  const stock = await db.collection("rack_stock")
    .where("rackId", "==", rackId)
    .where("activo", "==", true)
    .get();

  const operaciones = stock.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    cantidadActual: 0,
    updatedBy: {
      id: user?.id,
      nombre: user?.nombre,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }));

  const batch = db.batch();
  operaciones.forEach((op) => {
    batch.update(db.collection("rack_stock").doc(op.id), {
      cantidadActual: 0,
      updatedBy: op.updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { success: true };
});
