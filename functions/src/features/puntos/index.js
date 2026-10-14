const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const PUNTO_RULES = {
  encuesta_completada: { puntos: 50, objetivo: true },
  capacitacion_completada: { puntos: 100, objetivo: true },
  sugerencia_enviada: { puntos: 20, objetivo: true },
  sugerencia_aprobada: { puntos: 50, badge: true },
  cita_asistida: { puntos: 10, objetivo: false },
};

const NIVELES = {
  Bronce: { min: 0, max: 499 },
  Plata: { min: 500, max: 999 },
  Oro: { min: 1000, max: 1100 },
};

const obtenerAnio = () => new Date().getFullYear().toString();

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

const refHistorial = (userDocId, anio) =>
  db.collection("users").doc(userDocId).collection(anio)
    .doc("informacion").collection("historialPuntos");

const refPuntos = (userDocId, anio) =>
  db.collection("users").doc(userDocId).collection(anio)
    .doc("informacion").collection("puntos_general").doc("general");

// Acepta el id del documento en "users" o el uid de Auth y devuelve el id del documento.
const resolverUserDocId = async (valor) => {
  if (!valor || typeof valor !== "string" || valor.trim() === "") return null;
  const direct = await db.collection("users").doc(valor).get();
  if (direct.exists) return valor;
  const snapshot = await db.collection("users").where("uid", "==", valor).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0].id;
};

const calcularNivel = (puntos) => {
  for (const [nivel, { min, max }] of Object.entries(NIVELES)) {
    if (puntos >= min && puntos <= max) return nivel;
  }
  return "Bronce";
};

const calcularProximoNivel = (puntos) => {
  const niveles = [
    { min: 0, max: 499 },
    { min: 500, max: 999 },
    { min: 1000, max: Infinity },
  ];
  for (let i = 0; i < niveles.length; i++) {
    const actual = niveles[i];
    if (puntos >= actual.min && puntos <= actual.max) {
      if (i === niveles.length - 1) return puntos;
      return niveles[i + 1].min - puntos;
    }
  }
  return 0;
};

const recalcularPuntos = async (userDocId, anio) => {
  const snapshot = await refHistorial(userDocId, anio).get();
  const total = snapshot.docs.reduce((suma, d) => suma + (d.data().puntos || 0), 0);
  await refPuntos(userDocId, anio).set(
    {
      total,
      nivel: calcularNivel(total),
      proximoNivel: calcularProximoNivel(total),
      actualizadoEn: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return total;
};

const actualizarRanking = async (userDocId, anio) => {
  const userSnap = await db.collection("users").doc(userDocId).get();
  if (!userSnap.exists) return;

  const userData = userSnap.data();
  const areaFinal = userData.nombreArea || userData.area || userData.Area;
  if (!areaFinal) return;

  const equipo = userData.equipo || "";
  const nombre = userData.nombre || "Usuario";

  let usuariosArea = await db.collection("users").where("area", "==", areaFinal).get();
  if (usuariosArea.empty) {
    usuariosArea = await db.collection("users").where("Area", "==", areaFinal).get();
  }

  const operadores = usuariosArea.docs.filter((uDoc) => {
    const uData = uDoc.data();
    if (uData.activo === false) return false;
    const rol = String(uData.rol || uData.Rol || "").toLowerCase();
    return rol.includes("operador");
  });

  const conPuntos = await Promise.all(
    operadores.map(async (uDoc) => {
      const pSnap = await refPuntos(uDoc.id, anio).get();
      return {
        uid: uDoc.id,
        puntos: pSnap.exists ? (pSnap.data().total || 0) : 0,
        nivel: pSnap.exists ? (pSnap.data().nivel || "Bronce") : "Bronce",
      };
    })
  );

  if (conPuntos.length === 0) return;

  conPuntos.sort((a, b) => b.puntos - a.puntos);
  const posicionArea = conPuntos.findIndex((u) => u.uid === userDocId) + 1;
  const totalEnArea = conPuntos.length;
  const misDatos = conPuntos.find((u) => u.uid === userDocId);

  await db.collection("rankings_users").doc(userDocId).set(
    {
      uid: userDocId,
      nombre,
      puntos: misDatos ? misDatos.puntos : 0,
      nivel: misDatos ? misDatos.nivel : "Bronce",
      area: areaFinal,
      nombreArea: areaFinal,
      equipo,
      posicionArea,
      totalEnArea,
      actualizadoEn: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const aMilisegundos = (valor) => {
  if (!valor) return 0;
  if (typeof valor.toMillis === "function") return valor.toMillis();
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
};

exports.registrarPuntos = onCall(async (request) => {
  requireAuth(request);
  const { userId, tipo, referencia } = request.data || {};

  const userDocId = await resolverUserDocId(userId);
  if (!userDocId) throw new HttpsError("not-found", "Usuario no encontrado.");

  const puntos = PUNTO_RULES[tipo]?.puntos;
  if (!puntos) throw new HttpsError("invalid-argument", "Tipo de punto no válido.");

  const anio = obtenerAnio();
  await refHistorial(userDocId, anio).add({
    tipo,
    puntos,
    referencia: referencia ?? null,
    fechaCreacion: FieldValue.serverTimestamp(),
  });

  await recalcularPuntos(userDocId, anio);
  await actualizarRanking(userDocId, anio);

  return { ok: true };
});

exports.obtenerPuntosUsuario = onCall(async (request) => {
  requireAuth(request);
  const { userId, anio = obtenerAnio() } = request.data || {};

  const defaults = { total: 0, nivel: "Bronce", proximoNivel: 500 };
  const userDocId = await resolverUserDocId(userId);
  if (!userDocId) return defaults;

  const snap = await refPuntos(userDocId, anio).get();
  if (!snap.exists) return defaults;

  const data = snap.data();
  return {
    total: data.total || 0,
    nivel: data.nivel || "Bronce",
    proximoNivel: data.proximoNivel ?? 500,
  };
});

exports.obtenerHistorialPuntos = onCall(async (request) => {
  requireAuth(request);
  const { userId, limitNum = 10, anio = obtenerAnio() } = request.data || {};

  const userDocId = await resolverUserDocId(userId);
  if (!userDocId) return { items: [] };

  const snapshot = await refHistorial(userDocId, anio)
    .orderBy("fechaCreacion", "desc")
    .limit(Number(limitNum) || 10)
    .get();

  return {
    items: snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      fechaCreacion: aMilisegundos(d.data().fechaCreacion),
    })),
  };
});

exports.obtenerUltimosLogros = onCall(async (request) => {
  requireAuth(request);
  const { userId, limitNum = 4, anio = obtenerAnio() } = request.data || {};

  const userDocId = await resolverUserDocId(userId);
  if (!userDocId) return { items: [] };

  const snapshot = await refHistorial(userDocId, anio).get();
  const items = snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      fechaCreacion: aMilisegundos(d.data().fechaCreacion),
    }))
    .sort((a, b) => b.fechaCreacion - a.fechaCreacion)
    .slice(0, Number(limitNum) || 4);

  return { items };
});

exports.obtenerObjetivosCompletados = onCall(async (request) => {
  requireAuth(request);
  const { userId, anio = obtenerAnio() } = request.data || {};

  const userDocId = await resolverUserDocId(userId);
  if (!userDocId) return { objetivos: {} };

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();

  const snapshot = await refHistorial(userDocId, anio).get();
  const objetivos = {};
  snapshot.docs.forEach((d) => {
    const data = d.data();
    const fecha = aMilisegundos(data.fechaCreacion);
    if (fecha && fecha >= inicioMes && PUNTO_RULES[data.tipo]?.objetivo) {
      objetivos[data.tipo] = (objetivos[data.tipo] || 0) + 1;
    }
  });

  return { objetivos };
});
