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

const registrarMovimientoCore = async (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Se requieren datos válidos para registrar el movimiento.");
  }

  const docRef = await movimientoRackCollection.add({
    ...data,
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

const obtenerMovimientosPorFechaCore = async (data = {}) => {
  const rackId = data?.rackId;
  const fechaInicio = data?.fechaInicio;
  const fechaFin = data?.fechaFin;

  const snap = await movimientoRackCollection
    .where("rackId", "==", rackId)
    .orderBy("createdAt", "desc")
    .get();

  const movimientos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const filtered = movimientos.filter((mov) => {
    const fecha = mov.fecha;
    return fecha >= fechaInicio && fecha <= fechaFin;
  });

  return { movimientos: filtered };
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
