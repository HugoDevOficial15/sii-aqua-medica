import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { createNotification } from "./createNotification";

/**
 * Envía notificación a admins específicos
 * @param {Object} notification - Objeto con Titulo, Mensaje, Destino, etc.
 * @param {Array} rolesPermitidos - Roles de admin que recibirán la notificación (ej: ["admin_sistemas", "admin_super"])
 */
export const sendAdminNotification = async (notification, rolesPermitidos = ["admin_sistemas", "admin_super"]) => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const admins = usersSnapshot.docs
      .filter(doc => {
        const rol = doc.data().rol || "";
        return rolesPermitidos.includes(rol);
      })
      .map(doc => ({ docId: doc.id, uid: doc.data().uid, ...doc.data() }));

    // Enviar notificación a cada admin permitido
    for (const admin of admins) {
      const adminId = admin.uid || admin.docId;
      if (adminId) {
        await createNotification({
          IdUsuario: adminId,
          ...notification
        });
      }
    }
  } catch (error) {
    console.error("Error al notificar a admins:", error);
    // No lanzamos el error para que la operación principal se haya completado aunque falle la notificación
  }
};
