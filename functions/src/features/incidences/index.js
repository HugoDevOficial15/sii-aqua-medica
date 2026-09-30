const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const incidencesCollection = db.collection("incidences");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorIncidences = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();

    // Obtener incidencias del usuario por nómina o UID
    const snapshot = await incidencesCollection
      .where("usuarioId", "in", [uid, userData?.nomina, userData?.id])
      .orderBy("fecha", "desc")
      .get();

    const incidences = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Agrupar por estado
    const byStatus = {
      activas: [],
      resueltas: [],
      pendientes: [],
    };

    incidences.forEach(inc => {
      const status = inc.estado || "pendientes";
      if (byStatus[status]) {
        byStatus[status].push(inc);
      } else {
        byStatus.pendientes.push(inc);
      }
    });

    return {
      incidences,
      byStatus,
      total: incidences.length,
    };
  } catch (error) {
    console.error("Error in getOperatorIncidences:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener incidencias");
  }
});

exports.getIncidenceDetails = onCall(async (request) => {
  requireAuth(request);

  const { incidenceId } = request.data || {};

  try {
    if (!incidenceId) {
      throw new HttpsError("invalid-argument", "ID de incidencia requerido");
    }

    const incidenceDoc = await incidencesCollection.doc(incidenceId).get();
    if (!incidenceDoc.exists) {
      throw new HttpsError("not-found", "Incidencia no encontrada");
    }

    return {
      incidence: {
        id: incidenceDoc.id,
        ...incidenceDoc.data(),
      },
    };
  } catch (error) {
    console.error("Error in getIncidenceDetails:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener detalles de incidencia");
  }
});
