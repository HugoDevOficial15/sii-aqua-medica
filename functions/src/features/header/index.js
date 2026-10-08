const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const notifyCollection = db.collection("notificaciones");

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const normalizeArea = (value = "") => String(value ?? "").trim().toLowerCase();

exports.loadNotifications = onCall(async (request) => {
  const currentUserId = request.auth?.uid;

  if (!currentUserId) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para ver tus notificaciones.");
  }

  const currentUserDoc = await db.collection("users").where("uid", "==", currentUserId).limit(1).get();
  const currentUserData = !currentUserDoc.empty ? currentUserDoc.docs[0].data() : {};
  const currentUserDocId = !currentUserDoc.empty ? currentUserDoc.docs[0].id : null;
  const currentUserArea = normalizeArea(currentUserData?.area ?? currentUserData?.Area ?? currentUserData?.perfil?.area ?? currentUserData?.perfil?.Area);
  const targetIds = Array.from(new Set([String(currentUserId), String(currentUserDocId || "")].filter(Boolean)));

  const notificationSnapshots = await Promise.all(
    targetIds.map((targetId) => notifyCollection.where("IdUsuario", "==", targetId).get())
  );

  const notificationDocs = notificationSnapshots.flatMap((snapshot) => snapshot.docs);
  const uniqueNotifications = new Map();

  notificationDocs.forEach((doc) => {
    if (!uniqueNotifications.has(doc.id)) {
      uniqueNotifications.set(doc.id, doc);
    }
  });

  const notifications = [...uniqueNotifications.values()]
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((notification) => {
      const notificationArea = normalizeArea(
        notification?.extra?.usuarioArea ||
        notification?.extra?.areaUsuario ||
        notification?.usuarioArea ||
        notification?.area ||
        notification?.extra?.adminArea ||
        notification?.adminArea ||
        notification?.extra?.areaAdmin ||
        notification?.areaAdmin ||
        ""
      );

      if (!currentUserArea) return true;
      if (!notificationArea) return true;
      return notificationArea === currentUserArea;
    })
    .sort((a, b) => toTimestamp(b.fechaCreacion) - toTimestamp(a.fechaCreacion))
    .slice(0, 50)
    .map((notification) => ({
      id: notification.id,
      title: notification.Titulo || "Nueva notificación",
      subtitle: notification.Mensaje || notification.extra?.motivo || "Sin detalles",
      ruta: notification.Destino || "/",
      nomina: notification.extra?.nomina ?? notification.nomina ?? null,
      nombre: notification.extra?.nombre ?? notification.nombre ?? null,
      source: "firebase",
      persistedInDb: true,
    }));

  return { notifications };
});

exports.dismissHeaderNotification = onCall(async (request) => {
  const currentUserId = request.auth?.uid;
  const { notificationId } = request.data ?? {};

  if (!currentUserId) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para gestionar notificaciones.");
  }

  if (!notificationId) {
    throw new HttpsError("invalid-argument", "Falta el identificador de la notificación.");
  }

  const notificationRef = notifyCollection.doc(notificationId);
  const notificationDoc = await notificationRef.get();

  if (!notificationDoc.exists) {
    return { deleted: false, id: notificationId };
  }

  const notificationData = notificationDoc.data() || {};
  const currentUserDoc = await db.collection("users").where("uid", "==", currentUserId).limit(1).get();
  const currentUserDocId = !currentUserDoc.empty ? currentUserDoc.docs[0].id : null;
  const isOwnNotification = [String(currentUserId), String(currentUserDocId || "")].includes(String(notificationData.IdUsuario));

  if (!isOwnNotification) {
    throw new HttpsError("permission-denied", "No puedes eliminar una notificación que no te pertenece.");
  }

  await notificationRef.delete();

  return { deleted: true, id: notificationId };
});