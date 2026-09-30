const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const notificationsCollection = db.collection("notifications");
const newsCollection = db.collection("news");
const surveyCollection = db.collection("surveys");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorHomeDashboard = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const userIds = [uid, userData?.id, userData?.nomina];

    // Obtener notificaciones recientes
    const notificationsSnapshot = await notificationsCollection
      .where("userId", "in", userIds)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener noticias recientes
    const newsSnapshot = await newsCollection
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    const news = newsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener encuestas pendientes
    const surveysSnapshot = await surveyCollection
      .where("estado", "==", "activa")
      .limit(5)
      .get();

    const surveys = surveysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      user: {
        nombre: userData?.nombre,
        fotoPerfil: userData?.fotoPerfil,
        rol: userData?.rol,
        area: userData?.area,
      },
      notifications,
      news,
      surveys,
      stats: {
        pendingNotifications: notifications.length,
        latestNews: news.length,
        pendingSurveys: surveys.length,
      },
    };
  } catch (error) {
    console.error("Error in getOperatorHomeDashboard:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener dashboard del operador");
  }
});

exports.getOperatorStats = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const userIds = [uid, userData?.id, userData?.nomina];

    // Contar notificaciones
    const notifSnapshot = await notificationsCollection
      .where("userId", "in", userIds)
      .get();

    // Contar encuestas pendientes
    const surveysSnapshot = await surveyCollection
      .where("estado", "==", "activa")
      .get();

    return {
      stats: {
        notifications: notifSnapshot.size,
        surveys: surveysSnapshot.size,
        hasUpdates: notifSnapshot.size > 0 || surveysSnapshot.size > 0,
      },
    };
  } catch (error) {
    console.error("Error in getOperatorStats:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener estadísticas");
  }
});
