const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

const SIN_POSICION = {
  posicionArea: 0,
  posicionGlobal: 0,
  totalEnArea: 0,
  nombreArea: "Sin Área",
  puntos: 0,
  nivel: "Bronce",
};

// Acepta el id del documento en "users" o el uid de Auth y devuelve el id del documento.
const resolverUserDocId = async (valor) => {
  if (!valor || typeof valor !== "string" || valor.trim() === "") return null;
  const direct = await db.collection("users").doc(valor).get();
  if (direct.exists) return valor;
  const snapshot = await db.collection("users").where("uid", "==", valor).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0].id;
};

const ordenarConPosicion = (docs) =>
  docs
    .map((d) => ({ ...d.data() }))
    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
    .map((usuario, index) => ({ ...usuario, posicion: index + 1 }));

exports.obtenerTopArea = onCall(async (request) => {
  requireAuth(request);
  const { nombreArea, limitNum = 3 } = request.data || {};
  if (!nombreArea) return { items: [] };

  const snapshot = await db.collection("rankings_users").where("area", "==", nombreArea).get();
  const items = ordenarConPosicion(snapshot.docs).slice(0, Number(limitNum) || 3);
  return { items };
});

exports.obtenerUsuariosArea = onCall(async (request) => {
  requireAuth(request);
  const { nombreArea } = request.data || {};
  if (!nombreArea) return { items: [] };

  const snapshot = await db.collection("rankings_users").where("area", "==", nombreArea).get();
  return { items: ordenarConPosicion(snapshot.docs) };
});

exports.obtenerTopGlobal = onCall(async (request) => {
  requireAuth(request);
  const { limitNum = 3 } = request.data || {};

  const snapshot = await db.collection("rankings_users")
    .orderBy("puntos", "desc")
    .limit(Number(limitNum) || 3)
    .get();

  return {
    items: snapshot.docs.map((d, index) => ({ ...d.data(), posicion: index + 1 })),
  };
});

exports.obtenerMiPosicionArea = onCall(async (request) => {
  requireAuth(request);
  const { userId } = request.data || {};

  const userDocId = await resolverUserDocId(userId);
  if (!userDocId) return SIN_POSICION;

  const snap = await db.collection("rankings_users").doc(userDocId).get();
  if (!snap.exists) return SIN_POSICION;

  const data = snap.data();
  return {
    posicionArea: data.posicionArea || 0,
    posicionGlobal: data.posicionGlobal || 0,
    totalEnArea: data.totalEnArea || 0,
    nombreArea: data.area || data.nombreArea || "Sin Área",
    puntos: data.puntos || 0,
    nivel: data.nivel || "Bronce",
  };
});
