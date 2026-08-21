// ============================================================
// Utilidad centralizada para persistencia de notificaciones
// Ubicación: src/utils/notificationPersistence.js
// ============================================================

const DISMISSED_NOTIFS_KEY = "dismissed_notifications";

/**
 * Obtiene IDs de notificaciones descartadas desde cookies y localStorage
 * Las cookies son inmunes a localStorage.clear()
 * @returns {Array<string>} Array de IDs descartados
 */
export const getDismissedNotifications = () => {
    try {
        // 1️⃣ Intentar leer desde cookies (primaria)
        const nameEQ = DISMISSED_NOTIFS_KEY + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
            }
        }

        // 2️⃣ Fallback a localStorage
        const raw = localStorage.getItem(DISMISSED_NOTIFS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error("Error leyendo notificaciones descartadas:", err);
        return [];
    }
};

/**
 * Marca una notificación como descartada en cookies y localStorage
 * @param {string} notificationId - ID de la notificación en Firestore
 */
export const dismissNotification = (notificationId) => {
    try {
        const arr = getDismissedNotifications();
        if (!arr.includes(notificationId)) {
            arr.push(notificationId);

            // Limitar a máximo 500 registros (evitar cookie muy grande)
            if (arr.length > 500) arr.shift();

            const stringified = JSON.stringify(arr);

            // Guardar en localStorage (respaldo)
            localStorage.setItem(DISMISSED_NOTIFS_KEY, stringified);

            // Guardar en Cookie (válida 30 días, inmune a logout)
            const d = new Date();
            d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
            document.cookie = `${DISMISSED_NOTIFS_KEY}=${encodeURIComponent(stringified)};expires=${d.toUTCString()};path=/`;
        }
    } catch (err) {
        console.error("Error guardando notificación descartada:", err);
    }
};

/**
 * Filtra notificaciones eliminando las que fueron descartadas
 * @param {Array} notifications - Array de notificaciones de Firestore
 * @returns {Array} Notificaciones filtradas (solo las NO descartadas)
 */
export const filterDismissedNotifications = (notifications) => {
    const dismissed = getDismissedNotifications();
    return notifications.filter(notif => !dismissed.includes(notif.id));
};

/**
 * Limpia todas las notificaciones descartadas
 * Útil para logout o reset
 */
export const clearDismissedNotifications = () => {
    try {
        localStorage.removeItem(DISMISSED_NOTIFS_KEY);
        // Eliminar cookie estableciendo fecha de expiración pasada
        document.cookie = `${DISMISSED_NOTIFS_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    } catch (err) {
        console.error("Error limpiando notificaciones descartadas:", err);
    }
};
