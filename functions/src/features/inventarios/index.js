const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const inventarioCollection = db.collection("equipos");

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const getRequestData = (request) => request?.data ?? {};

const buildQuery = ({ estado = null, tipo = null } = {}) => {
  let query = inventarioCollection;

  if (estado !== null && estado !== undefined) {
    query = query.where("estado", "==", normalizeBoolean(estado, Boolean(estado)));
  }

  if (tipo !== null && tipo !== undefined && String(tipo).trim() !== "") {
    query = query.where("tipo", "==", String(tipo));
  }

  return query.orderBy("codigo", "asc");
};

exports.getEquipos = onCall(async (request) => {
  const data = getRequestData(request);
  const { estado = null, tipo = null, pageSize = null, cursor = null } = data || {};
  const normalizedPageSize = Number(pageSize || 0);

  if (normalizedPageSize > 0) {
    const limit = Math.min(Math.max(normalizedPageSize, 1), 100);
    let query = buildQuery({ estado, tipo }).limit(limit + 1);

    if (cursor !== undefined && cursor !== null && cursor !== "") {
      query = query.startAfter(String(cursor));
    }

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const items = (hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs).map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]?.codigo ?? null : null,
    };
  }

  const snapshot = await buildQuery({ estado, tipo }).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.createEquipo = onCall(async (request) => {
  const data = getRequestData(request);
  const { id, ...payload } = data || {};

  const equipo = {
    ...payload,
    codigo: String(payload.codigo ?? "").trim(),
    tipo: String(payload.tipo ?? "").trim(),
    usuarioId: payload.usuarioId ?? "",
    areaId: payload.areaId ?? "",
    observaciones: String(payload.observaciones ?? "").trim(),
    servicioExterno: normalizeBoolean(payload.servicioExterno, false),
    garantia: normalizeBoolean(payload.garantia, false),
    estado: normalizeBoolean(payload.estado, true),
    activo: normalizeBoolean(payload.activo, true),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!equipo.codigo) {
    throw new HttpsError("invalid-argument", "El código del equipo es requerido.");
  }

  const ref = await inventarioCollection.add(equipo);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});

exports.updateEquipo = onCall(async (request) => {
  const data = getRequestData(request);
  const { id, ...payload } = data || {};

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID del equipo es requerido.");
  }

  const ref = inventarioCollection.doc(id);
  const currentDoc = await ref.get();

  if (!currentDoc.exists) {
    throw new HttpsError("not-found", "El equipo no existe.");
  }

  const current = currentDoc.data() || {};
  const equipoActualizado = {
    ...current,
    ...payload,
    codigo: String(payload.codigo ?? current.codigo ?? "").trim(),
    tipo: String(payload.tipo ?? current.tipo ?? "").trim(),
    usuarioId: payload.usuarioId ?? current.usuarioId ?? "",
    areaId: payload.areaId ?? current.areaId ?? "",
    observaciones: String(payload.observaciones ?? current.observaciones ?? "").trim(),
    servicioExterno: normalizeBoolean(payload.servicioExterno, Boolean(current.servicioExterno)),
    garantia: normalizeBoolean(payload.garantia, Boolean(current.garantia)),
    estado: typeof payload.estado === "boolean" ? payload.estado : (typeof current.estado === "boolean" ? current.estado : true),
    activo: typeof payload.activo === "boolean" ? payload.activo : (typeof current.activo === "boolean" ? current.activo : true),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!equipoActualizado.codigo) {
    throw new HttpsError("invalid-argument", "El código del equipo es requerido.");
  }

  await ref.update(equipoActualizado);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});

exports.activarEquipo = onCall(async (request) => {
  const id = request?.data?.id;

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID del equipo es requerido.");
  }

  const ref = inventarioCollection.doc(id);
  await ref.update({
    estado: true,
    activo: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});

exports.bajaEquipo = onCall(async (request) => {
  const id = request?.data?.id;

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID del equipo es requerido.");
  }

  const ref = inventarioCollection.doc(id);
  await ref.update({
    estado: false,
    activo: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
});



