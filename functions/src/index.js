// ============================================================
// pushNotificationService.js (REFACTORIZADO)
//
// ¡ATENCIÓN! La lógica local ha sido desactivada.
// Las notificaciones ahora se envían de forma remota y segura
// mediante Firebase Cloud Functions (FCM) y se gestionan en
// usePushNotifications.js
// ============================================================

const locks = require("./features/locks");
const surveys = require("./features/surveys");
const notificationTriggers = require("./features/sendNotificationOnCreate");

const initPushNotifications = async () => {
  console.log("✓ Servicio local de push desactivado. Cloud Functions al mando.");
};

const stopPushNotifications = () => {
  // Como ya no hay un 'unsubscribe' de Firestore activo,
  // esta función solo se mantiene para evitar errores de importación.
  console.log("✓ No hay listeners locales que detener.");
};

module.exports = {
  ...locks,
  ...surveys,
  ...notificationTriggers,
  initPushNotifications,
  stopPushNotifications,
};