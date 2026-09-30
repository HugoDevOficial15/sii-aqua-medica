const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const notificationsCollection = db.collection("notifications");
const usersCollection = db.collection("users");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

const getNotificationUserIds = (user) => [...new Set([
  user?.uid,
  user?.id,
  user?.userId,
  user?.nomina,
  user?.nominaUsuario,
  user?.numeroNomina
].map(value => String(value ?? '').trim()).filter(Boolean))];

exports.getOperatorNotifications = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    // Obtener datos del usuario
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const userIds = getNotificationUserIds(userData);

    // Obtener notificaciones del usuario
    const notificationsSnapshot = await notificationsCollection
      .where("userId", "in", userIds)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      notifications,
      count: notifications.length,
    };
  } catch (error) {
    console.error("Error in getOperatorNotifications:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener notificaciones");
  }
});

exports.deleteNotification = onCall(async (request) => {
  requireAuth(request);

  const { notificationId } = request.data || {};

  try {
    if (!notificationId) {
      throw new HttpsError("invalid-argument", "ID de notificación requerido");
    }

    const notifDoc = await notificationsCollection.doc(notificationId).get();
    if (!notifDoc.exists) {
      throw new HttpsError("not-found", "Notificación no encontrada");
    }

    await notificationsCollection.doc(notificationId).delete();

    return {
      success: true,
      message: "Notificación eliminada",
    };
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al eliminar notificación");
  }
});

exports.clearAllNotifications = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const userIds = getNotificationUserIds(userData);

    const notificationsSnapshot = await notificationsCollection
      .where("userId", "in", userIds)
      .get();

    const batch = db.batch();
    notificationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return {
      success: true,
      deletedCount: notificationsSnapshot.size,
    };
  } catch (error) {
    console.error("Error in clearAllNotifications:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al limpiar notificaciones");
  }
});
