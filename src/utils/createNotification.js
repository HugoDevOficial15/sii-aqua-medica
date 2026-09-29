// ============================================================
// Utilidad centralizada para crear notificaciones push
// Ubicación: src/utils/createNotification.js
// ============================================================

import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const saveNotificationFunction = httpsCallable(functions, "saveNotification");

/**
 * Crea una notificación en Firestore desde Cloud Functions.
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

    const result = await saveNotificationFunction({
        IdUsuario,
        Titulo,
        Mensaje,
        Destino: Destino || null,
        Accion: Accion || null,
        extra,
    });

    return {
        id: result?.data?.id || null,
        IdUsuario,
        Titulo,
        Mensaje,
        Destino: Destino || null,
        Accion: Accion || null,
        enviado: false,
        fechaEnviado: null,
        ...extra,
    };
};