const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const notificacionCollection = db.collection("notificaciones");
const usuariosCollection = db.collection("users");

const validarNotificacion = (data = {}) => {
    const {
        IdUsuario,
        Titulo,
        Mensaje,
        Destino = null,
        Accion = null,
        extra = {},
    } = data;

    if (!IdUsuario) {
        throw new HttpsError("invalid-argument", "IdUsuario es requerido para crear una notificación.");
    }

    if (!Titulo || !String(Titulo).trim()) {
        throw new HttpsError("invalid-argument", "Titulo es requerido para crear una notificación.");
    }

    if (!Mensaje || !String(Mensaje).trim()) {
        throw new HttpsError("invalid-argument", "Mensaje es requerido para crear una notificación.");
    }

    return {
        IdUsuario,
        Titulo: String(Titulo).trim(),
        Mensaje: String(Mensaje).trim(),
        Destino: Destino || null,
        Accion: Accion || null,
        enviado: false,
        fechaCreacion: FieldValue.serverTimestamp(),
        fechaEnviado: null,
        ...extra,
    };
};

const crearNotificacionEnBd = async (payload = {}) => {
    const notificationData = validarNotificacion(payload);
    const docRef = await notificacionCollection.add(notificationData);
    return { id: docRef.id, success: true };
};

exports.saveNotification = onCall(async (request) => {
    try {
        const payload = request?.data || {};
        return await crearNotificacionEnBd(payload);
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }

        throw new HttpsError("internal", "Error saving notification", { original: error?.message || error });
    }
});

exports.createNotification = exports.saveNotification;

exports.getAdminsByRoles = onCall(async (request) => {
    const rolesPermitidos = Array.isArray(request?.data?.rolesPermitidos)
        ? request.data.rolesPermitidos
        : ["admin_sistemas", "admin_super"];

    const snapshot = await usuariosCollection
        .where("rol", "in", rolesPermitidos)
        .limit(100)
        .get();

    const admins = snapshot.docs.map((doc) => ({
        docId: doc.id,
        uid: doc.data().uid,
        ...doc.data(),
    }));

    return { success: true, admins };
});

exports.sendAdminNotificationToRoles = onCall(async (request) => {
    const { notification = {}, rolesPermitidos = ["admin_sistemas", "admin_super"] } = request?.data || {};

    const snapshot = await usuariosCollection
        .where("rol", "in", rolesPermitidos)
        .limit(100)
        .get();

    const admins = snapshot.docs.map((doc) => ({
        docId: doc.id,
        uid: doc.data().uid,
        ...doc.data(),
    }));

    let createdCount = 0;

    for (const admin of admins) {
        const adminId = admin.uid || admin.docId;

        if (!adminId) continue;

        await crearNotificacionEnBd({
            IdUsuario: adminId,
            ...notification,
        });

        createdCount += 1;
        console.log(`Created ${createdCount} notifications for admins.`);

    }

    return { success: true, count: createdCount };
});

exports.saveMenuNotification = onCall(async (request) => {
    try {
        const { tipo, titulo, mensaje, semana, semanaId, datos = {} } = request?.data || {};

        if (!tipo || !titulo || !mensaje) {
            throw new HttpsError("invalid-argument", "tipo, titulo y mensaje son requeridos");
        }

        const notificacion = {
            IdUsuario: "GLOBAL", // Notificación global para todos los operadores
            tipo,
            titulo,
            mensaje,
            semana,
            semanaId,
            Destino: "comedor",
            Accion: "menu_publicado",
            enviado: true,
            fechaCreacion: FieldValue.serverTimestamp(),
            fechaEnviado: FieldValue.serverTimestamp(),
            leido: false,
            datos,
        };

        const docRef = await notificacionCollection.add(notificacion);

        console.log("✓ Notificación de menú guardada en colección notificaciones:", docRef.id);

        return {
            success: true,
            id: docRef.id,
            message: "Notificación guardada correctamente",
        };
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }

        console.error("Error al guardar notificación de menú:", error);
        throw new HttpsError("internal", "Error saving menu notification", {
            original: error?.message || error,
        });
    }
});