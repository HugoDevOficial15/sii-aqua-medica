const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const recognitionsCollection = db.collection("recognitions");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorRecognitions = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    // Obtener reconocimientos del usuario
    const recognitionsSnapshot = await recognitionsCollection
      .where("usuarioId", "==", uid)
      .orderBy("fecha", "desc")
      .get();

    const recognitions = recognitionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      recognitions,
      count: recognitions.length,
    };
  } catch (error) {
    console.error("Error in getOperatorRecognitions:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener reconocimientos");
  }
});

exports.getRecognitionsByArea = onCall(async (request) => {
  requireAuth(request);

  try {
    const snapshot = await recognitionsCollection
      .orderBy("fecha", "desc")
      .limit(100)
      .get();

    const recognitions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Agrupar por área
    const byArea = {};
    recognitions.forEach(rec => {
      if (!byArea[rec.area]) {
        byArea[rec.area] = [];
      }
      byArea[rec.area].push(rec);
    });

    return {
      recognitions,
      byArea,
      total: recognitions.length,
    };
  } catch (error) {
    console.error("Error in getRecognitionsByArea:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener reconocimientos por área");
  }
});
