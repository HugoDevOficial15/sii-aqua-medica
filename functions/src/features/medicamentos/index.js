const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const medicamentosCollection = db.collection("inventario_medicamentos");

const getRequestData = (request) => request?.data ?? {};

const parseDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const normalizeMedicamentoPayload = (payload = {}) => {
  const sanitized = { ...payload };
  const fechaCaducidad = parseDate(sanitized.fechaCaducidad);
  const fechaIngreso = parseDate(sanitized.fechaIngreso);

  if (!fechaCaducidad) {
    throw new HttpsError("invalid-argument", "La fecha de caducidad es obligatoria.");
  }

  if (!fechaIngreso) {
    throw new HttpsError("invalid-argument", "La fecha de ingreso es obligatoria.");
  }

  return {
    ...sanitized,
    nombreMedicamento: String(sanitized.nombreMedicamento ?? "").trim(),
    presentacion: String(sanitized.presentacion ?? "").trim(),
    cantidad: Number(sanitized.cantidad ?? 0),
    unidadCantidad: String(sanitized.unidadCantidad ?? "").trim(),
    lote: String(sanitized.lote ?? "").trim(),
    ubicacion: String(sanitized.ubicacion ?? "").trim(),
    observaciones: String(sanitized.observaciones ?? "").trim(),
    fechaCaducidad: Timestamp.fromDate(fechaCaducidad),
    fechaIngreso: Timestamp.fromDate(fechaIngreso),
    estado: sanitized.estado ?? "activo",
    updatedAt: FieldValue.serverTimestamp(),
  };
};

exports.getMedicamentos = onCall(async () => {
  const snapshot = await medicamentosCollection.orderBy("fechaCaducidad", "asc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.createMedicamento = onCall(async (request) => {
  const payload = getRequestData(request);

  if (!payload?.nombreMedicamento) {
    throw new HttpsError("invalid-argument", "El nombre del medicamento es obligatorio.");
  }

  const medicamento = {
    ...normalizeMedicamentoPayload(payload),
    createdAt: FieldValue.serverTimestamp(),
  };

  const ref = await medicamentosCollection.add(medicamento);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});

exports.updateMedicamento = onCall(async (request) => {
  const payload = getRequestData(request);
  const { id, ...data } = payload;

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID del medicamento es requerido.");
  }

  const ref = medicamentosCollection.doc(id);
  const currentDoc = await ref.get();

  if (!currentDoc.exists) {
    throw new HttpsError("not-found", "El medicamento no existe.");
  }

  const medicamentoActualizado = normalizeMedicamentoPayload({
    ...currentDoc.data(),
    ...data,
  });

  await ref.update(medicamentoActualizado);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});

exports.toggleMedicamento = onCall(async (request) => {
  const payload = getRequestData(request);
  const id = payload?.id;
  const estado = payload?.estado ?? payload?.activo;

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID del medicamento es requerido.");
  }

  if (estado === undefined || estado === null) {
    throw new HttpsError("invalid-argument", "El estado del medicamento es requerido.");
  }

  const ref = medicamentosCollection.doc(id);
  const currentDoc = await ref.get();

  if (!currentDoc.exists) {
    throw new HttpsError("not-found", "El medicamento no existe.");
  }

  await ref.update({
    estado: String(estado),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});

exports.deleteMedicamento = onCall(async (request) => {
  const payload = getRequestData(request);
  const id = payload?.id;

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID del medicamento es requerido.");
  }

  const ref = medicamentosCollection.doc(id);
  const currentDoc = await ref.get();

  if (!currentDoc.exists) {
    throw new HttpsError("not-found", "El medicamento no existe.");
  }

  await ref.delete();
  return { ok: true, id };
});