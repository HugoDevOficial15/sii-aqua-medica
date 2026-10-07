const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const notificationsCollection = db.collection("notificaciones");
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
  user?.numeroNomina,
  user?.docId,
].map((value) => String(value ?? "").trim()).filter(Boolean))];

const getUserIdsForCurrentUser = async (uid) => {
  const userDoc = await usersCollection.where("uid", "==", uid).limit(1).get();
  const userData = !userDoc.empty ? userDoc.docs[0].data() : {};
  const userIds = getNotificationUserIds(userData);

  return Array.from(new Set([String(uid), ...userIds]));
};

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

exports.getOperatorNotifications = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userIds = await getUserIdsForCurrentUser(uid);
    const notificationsSnapshot = await notificationsCollection
      .where("IdUsuario", "in", userIds)
      .limit(50)
      .get();

    const notifications = notificationsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => toTimestamp(b.fechaCreacion) - toTimestamp(a.fechaCreacion));

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

    const currentUserIds = await getUserIdsForCurrentUser(request.auth.uid);
    const notificationData = notifDoc.data() || {};
    const isOwnNotification = currentUserIds.includes(String(notificationData.IdUsuario));

    if (!isOwnNotification) {
      throw new HttpsError("permission-denied", "No puedes eliminar una notificación que no te pertenece.");
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
    const userIds = await getUserIdsForCurrentUser(uid);
    const notificationsSnapshot = await notificationsCollection
      .where("IdUsuario", "in", userIds)
      .get();

    if (notificationsSnapshot.empty) {
      return { success: true, deletedCount: 0 };
    }

    const batch = db.batch();
    notificationsSnapshot.docs.forEach((doc) => {
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
