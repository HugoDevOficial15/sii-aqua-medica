// ============================================================
// pushNotificationService.js (REFACTORIZADO)
// 
// ¡ATENCIÓN! La lógica local ha sido desactivada.
// Las notificaciones ahora se envían de forma remota y segura 
// mediante Firebase Cloud Functions (FCM) y se gestionan en 
// usePushNotifications.js
// ============================================================

export const initPushNotifications = async (userDataOrId) => {
    // Ya no necesitamos barrer Firestore ni usar LocalNotifications aquí
    // porque el backend (Cloud Functions) ya se encarga de despertar el teléfono.
    console.log("✓ Servicio local de push desactivado. Cloud Functions al mando.");
};

export const stopPushNotifications = () => {
    // Como ya no hay un 'unsubscribe' de Firestore activo, 
    // esta función solo se mantiene para evitar errores de importación.
    console.log("✓ No hay listeners locales que detener.");
};