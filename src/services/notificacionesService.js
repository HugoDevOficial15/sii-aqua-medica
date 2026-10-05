import { getFirestore, collection, onSnapshot, query, orderBy, limit, updateDoc, doc, where } from "firebase/firestore";

const db = getFirestore();

/**
 * Escucha las notificaciones de menús publicados en tiempo real
 * Incluye notificaciones globales (GLOBAL) y del usuario actual
 * @param {string} userId - ID del usuario actual
 * @param {Function} callback - Función a ejecutar cuando hay nuevas notificaciones
 * @returns {Function} - Función para desuscribirse
 */
export const subscribirANotificacionesMenus = (userId, callback) => {
  try {
    // Escucha notificaciones globales de menú (IdUsuario = "GLOBAL")
    const q = query(
      collection(db, "notificaciones"),
      where("IdUsuario", "==", "GLOBAL"),
      where("Destino", "==", "comedor"),
      orderBy("fechaCreacion", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificaciones = [];
      snapshot.forEach((doc) => {
        notificaciones.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      callback(notificaciones);
    }, (error) => {
      console.error("Error escuchando notificaciones:", error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error en subscribirANotificacionesMenus:", error);
    return () => {};
  }
};

/**
 * Marca una notificación como leída
 * @param {string} notificacionId - ID de la notificación
 */
export const marcarNotificacionComoLeida = async (notificacionId) => {
  try {
    const notifRef = doc(db, "notificaciones", notificacionId);
    await updateDoc(notifRef, { leido: true });
  } catch (error) {
    console.error("Error marcando notificación como leída:", error);
  }
};

/**
 * Obtiene todas las notificaciones no leídas
 * @param {Array} notificaciones - Array de notificaciones
 * @returns {Array} - Notificaciones sin leer
 */
export const obtenerNotificacionesNoLeidas = (notificaciones) => {
  return notificaciones.filter((n) => !n.leido);
};
