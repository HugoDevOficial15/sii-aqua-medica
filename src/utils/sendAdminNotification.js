import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const sendAdminNotificationFunction = httpsCallable(functions, "sendAdminNotificationToRoles");

/**
 * Envía notificación a admins específicos
 * @param {Object} notification - Objeto con Titulo, Mensaje, Destino, etc.
 * @param {Array} rolesPermitidos - Roles de admin que recibirán la notificación (ej: ["admin_sistemas", "admin_super"])
 */
export const sendAdminNotification = async (notification, rolesPermitidos = ["admin_sistemas", "admin_super"]) => {
  try {
    const result = await sendAdminNotificationFunction({
      notification,
      rolesPermitidos,
    });

    return result?.data || { success: true, count: 0 };
  } catch (error) {
    console.error("Error al notificar a admins:", error);
    throw error;
  }
};
