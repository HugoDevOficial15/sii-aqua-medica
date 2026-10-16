const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const efemeridesCollection = db.collection("efemerides");

const getHoy = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeEfemeridePayload = (payload = {}) => {
  const cleaned = payload || {};

  return {
    titulo: String(cleaned.titulo ?? "").trim(),
    contenido: String(cleaned.contenido ?? "").trim(),
    fechaPublicacion: String(cleaned.fechaPublicacion ?? "").trim(),
    fechaLimite: String(cleaned.fechaLimite ?? "").trim(),
    areaDestino: String(cleaned.areaDestino ?? "Todas").trim() || "Todas",
    imagen: cleaned.imagen || "",
    estado: cleaned.estado || "Activa",
  };
};

// Lista las efemérides vigentes (fechaLimite >= hoy), más recientes primero
// Normaliza nombres de área para comparar (minúsculas, sin acentos ni espacios extra)
const normalizarArea = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

exports.getEfemerides = onCall(async (request) => {
  // soloVisibles: el operador solo ve las que ya llegaron a su fecha de publicación
  const { areaDestino, soloVisibles = false } = request?.data || {};
  const snapshot = await efemeridesCollection.orderBy("fechaCreacion", "desc").get();
  const fechaHoy = getHoy();

  const efemerides = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((item) => {
      if (item.fechaLimite && item.fechaLimite < fechaHoy) return false;
      if (soloVisibles && item.fechaPublicacion && item.fechaPublicacion > fechaHoy) return false;
      if (soloVisibles) {
        const destino = normalizarArea(item.areaDestino);
        if (!destino || destino === "todas") return true;
        return destino === normalizarArea(areaDestino) && normalizarArea(areaDestino) !== "";
      }

      // Administrador: sin filtro de área (ve todas)
      return true;
    });

  return { efemerides };
});

exports.createEfemeride = onCall(async (request) => {
  const authUser = request?.auth;
  if (!authUser?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear efemérides.");
  }

  const payload = normalizeEfemeridePayload(request?.data || {});
  if (!payload.titulo || !payload.contenido || !payload.fechaLimite || !payload.fechaPublicacion) {
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios de la efeméride.");
  }

  const ref = await efemeridesCollection.add({
    ...payload,
    fechaCreacion: FieldValue.serverTimestamp(),
    userId: authUser.uid,
  });

  return { ok: true, id: ref.id };
});

exports.updateEfemeride = onCall(async (request) => {
  const authUser = request?.auth;
  const payload = request?.data || {};
  const id = payload.id;

  if (!authUser?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para actualizar efemérides.");
  }
  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la efeméride.");
  }

  const snapshot = await efemeridesCollection.doc(id).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "La efeméride no existe.");
  }

  const cleanPayload = normalizeEfemeridePayload(payload);
  if (!cleanPayload.titulo || !cleanPayload.contenido || !cleanPayload.fechaLimite || !cleanPayload.fechaPublicacion) {
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios de la efeméride.");
  }
  await efemeridesCollection.doc(id).update({
    ...cleanPayload,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, id };
});

exports.deleteEfemeride = onCall(async (request) => {
  const authUser = request?.auth;
  const id = request?.data?.id;

  if (!authUser?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para eliminar efemérides.");
  }
  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la efeméride.");
  }

  const snapshot = await efemeridesCollection.doc(id).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "La efeméride no existe.");
  }

  await efemeridesCollection.doc(id).delete();
  return { ok: true, id };
});
