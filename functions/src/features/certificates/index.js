const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorCertificates = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const year = String(new Date().getFullYear());

    // Obtener respuestas de capacitaciones
    const capacitacionesSnapshot = await usersCollection
      .doc(uid)
      .collection(year)
      .doc("informacion")
      .collection("resultados")
      .where("tipo", "==", "capacitacion")
      .get();

    const capacitaciones = capacitacionesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener respuestas de surveys
    const surveysSnapshot = await usersCollection
      .doc(uid)
      .collection(year)
      .doc("informacion")
      .collection("resultados")
      .where("tipo", "==", "survey")
      .get();

    const surveys = surveysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const certificados = capacitaciones.filter(c => c.calificacion >= 80);
    const cursosAprobados = capacitaciones.filter(c => c.calificacion >= 80).length;

    return {
      certificates: certificados,
      surveys,
      stats: {
        certificados: certificados.length,
        cursosAprobados,
        year,
      },
    };
  } catch (error) {
    console.error("Error in getOperatorCertificates:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener certificados");
  }
});

exports.getCertificatesByYear = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { year } = request.data || {};

  try {
    if (!year) {
      throw new HttpsError("invalid-argument", "Año requerido");
    }

    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const snapshot = await usersCollection
      .doc(uid)
      .collection(String(year))
      .doc("informacion")
      .collection("resultados")
      .where("calificacion", ">=", 80)
      .get();

    const certificates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      certificates,
      count: certificates.length,
      year: String(year),
    };
  } catch (error) {
    console.error("Error in getCertificatesByYear:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener certificados del año");
  }
});
