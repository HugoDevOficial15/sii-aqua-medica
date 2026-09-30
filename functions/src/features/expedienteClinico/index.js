const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const ordenesMedicasCollection = db.collection("ordenesMedicas");
const expedientesCollection = db.collection("expedientes");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorExpediente = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    // Obtener expediente clínico
    const expedienteDoc = await expedientesCollection.doc(uid).get();
    const expediente = expedienteDoc.exists ? expedienteDoc.data() : null;

    // Obtener órdenes médicas
    const ordenesSnapshot = await ordenesMedicasCollection
      .where("usuarioId", "==", uid)
      .orderBy("fecha", "desc")
      .get();

    const ordenes = ordenesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      expediente,
      ordenes,
      stats: {
        totalOrdenes: ordenes.length,
        ordenesActivas: ordenes.filter(o => o.estado === "activa").length,
        ordenesCompletadas: ordenes.filter(o => o.estado === "completada").length,
      },
    };
  } catch (error) {
    console.error("Error in getOperatorExpediente:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener expediente clínico");
  }
});

exports.getOrdenMedica = onCall(async (request) => {
  requireAuth(request);

  const { ordenId } = request.data || {};

  try {
    if (!ordenId) {
      throw new HttpsError("invalid-argument", "ID de orden requerido");
    }

    const ordenDoc = await ordenesMedicasCollection.doc(ordenId).get();
    if (!ordenDoc.exists) {
      throw new HttpsError("not-found", "Orden médica no encontrada");
    }

    const orden = ordenDoc.data();
    const userDoc = await usersCollection.doc(request.auth.uid).get();
    const userData = userDoc.data();

    // Verificar que el usuario es dueño de la orden
    if (orden.usuarioId !== request.auth.uid && userData?.nomina !== orden.usuarioNomina) {
      throw new HttpsError("permission-denied", "No tienes permiso para ver esta orden");
    }

    return {
      orden: {
        id: ordenDoc.id,
        ...orden,
      },
    };
  } catch (error) {
    console.error("Error in getOrdenMedica:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener orden médica");
  }
});

exports.getOrdenesMedicasByEstado = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { estado } = request.data || {};

  try {
    let query = ordenesMedicasCollection.where("usuarioId", "==", uid);

    if (estado) {
      query = query.where("estado", "==", estado);
    }

    const snapshot = await query.orderBy("fecha", "desc").get();

    const ordenes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      ordenes,
      count: ordenes.length,
      estado: estado || "todos",
    };
  } catch (error) {
    console.error("Error in getOrdenesMedicasByEstado:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener órdenes médicas");
  }
});
