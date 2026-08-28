import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { createNotification } from "./createNotification";

/**
 * Envía notificación a admins específicos
 * @param {Object} notification - Objeto con Titulo, Mensaje, Destino, etc.
 * @param {Array} rolesPermitidos - Roles de admin que recibirán la notificación (ej: ["admin_sistemas", "admin_super"])
 */
export const sendAdminNotification = async (notification, rolesPermitidos = ["admin_sistemas", "admin_super"]) => {
  try {
    const usersQuery = query(
      collection(db, "users"),
      where("rol", "in", rolesPermitidos),
      limit(100)
    );

    const usersSnapshot = await getDocs(usersQuery);
    const admins = usersSnapshot.docs.map(doc => ({
      docId: doc.id,
      uid: doc.data().uid,
      ...doc.data()
    }));

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
  }
};
