// ============================================================
// Utilidad centralizada para crear notificaciones push
// Ubicación: src/utils/createNotification.js
// ============================================================

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Crea una notificación en Firestore con enviado: false
 * para que el listener en tiempo real dispare la notificación push.
 * 
 * @param {Object} params - Parámetros de la notificación
 * @param {string} params.IdUsuario - UID de Firebase del usuario destinatario
 * @param {string} params.Titulo - Título de la notificación
 * @param {string} params.Mensaje - Cuerpo o descripción del aviso
 * @param {string} [params.Destino] - Ruta interna de la app a donde redirigir (opcional)
 * @param {string} [params.Accion] - Tipo de acción específica (opcional)
 * @param {Object} [params.extra] - Campos adicionales opcionales
 * @returns {Promise<Object>} Objeto con el ID generado y los datos de la notificación
 */
export const createNotification = async ({
    IdUsuario,
    Titulo,
    Mensaje,
    Destino = null,
    Accion = null,
    extra = {}
}) => {
    if (!IdUsuario) {
        throw new Error("IdUsuario es requerido para crear una notificación");
    }

    if (!Titulo || !Mensaje) {
        throw new Error("Titulo y Mensaje son requeridos");
    }

    // Estructura estándar obligatoria para el funcionamiento del push
    const notificationData = {
        IdUsuario,
        Titulo,
        Mensaje,
        Destino: Destino || null,
        Accion: Accion || null,

        // 🔑 CLAVE: Indica que la notificación está pendiente de envío push
        enviado: false,

        // Auditoría y marcas de tiempo
        fechaCreacion: serverTimestamp(),
        fechaEnviado: null,

        // Propiedades adicionales flexibles
        ...extra
    };

    // Inserta el documento en la colección que escucha el listener
    const docRef = await addDoc(collection(db, "notificaciones"), notificationData);

    return {
        id: docRef.id,
        ...notificationData
    };
};