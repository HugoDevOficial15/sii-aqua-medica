const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { updateUserFieldsByNomina } = require("../usuarios/updateUserFieldsService");

const requestCollection = db.collection("solicitudesCambios");
const notificationsCollection = db.collection("notificaciones");

const CAMPOS_SOLICITABLES = [
  "nombre",
  "Genero",
  "area",
  "cumpleanos",
  "email",
  "fechaIngreso",
  "nomina",
  "puesto",
  "curp",
  "rfc",
  "nss",
];

const normalizeNomina = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const snapshotCampos = (data = {}) => {
  const snap = {};
  CAMPOS_SOLICITABLES.forEach((campo) => {
    snap[campo] = data?.[campo] ?? "";
  });
  return snap;
};

const resolvePrimaryNotificationUserId = async (userId) => {
  if (userId === undefined || userId === null || userId === "") {
    return null;
  }

  const value = String(userId).trim();
  if (!value) {
    return null;
  }

  const userByUid = await db.collection("users").where("uid", "==", value).limit(1).get();
  if (!userByUid.empty) {
    const data = userByUid.docs[0].data() || {};
    return String(data.uid || userByUid.docs[0].id);
  }

  const userByDocId = await db.collection("users").doc(value).get();
  if (userByDocId.exists) {
    const data = userByDocId.data() || {};
    return String(data.uid || userByDocId.id);
  }

  return value;
};

const createRequestNotification = async ({ userId, title, message, destino = "solicitudes", accion = null, extra = {} }) => {
  const primaryUserId = await resolvePrimaryNotificationUserId(userId);

  if (!primaryUserId) return null;

  const notificationRef = await notificationsCollection.add({
    IdUsuario: primaryUserId,
    Titulo: title,
    Mensaje: message,
    Destino: destino,
    Accion: accion,
    extra,
    enviado: false,
    fechaCreacion: FieldValue.serverTimestamp(),
    fechaEnviado: null,
  });

  return notificationRef.id;
};

const clearProfileRequestAdminNotifications = async (requestId) => {
  if (!requestId) return 0;

  const pendingNotifications = await notificationsCollection
    .where("Accion", "==", "solicitud_cambio_perfil")
    .where("extra.solicitudId", "==", requestId)
    .get();

  if (pendingNotifications.empty) {
    return 0;
  }

  const batch = db.batch();
  pendingNotifications.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return pendingNotifications.size;
};

const notifyAdminsOfProfileChangeRequest = async ({ requestId, user, changes = {} }) => {
  if (!requestId) return null;

  const solicitorName = user?.nombre || "Usuario";
  const changedFields = Object.keys(changes || {}).filter((campo) => changes[campo] !== undefined).slice(0, 4);

  const adminSnapshot = await db.collection("users")
    .where("rol", "==", "admin_sistemas")
    .get();

  if (adminSnapshot.empty) {
    return { success: true, count: 0 };
  }

  const notificationBase = {
    Titulo: "📋 Solicitud de cambio de perfil",
    Mensaje: `${solicitorName} solicitó actualizar ${changedFields.length ? changedFields.join(", ") : "sus datos"}. Revisa la solicitud para continuar.`,
    Destino: "solicitudes",
    Accion: "solicitud_cambio_perfil",
    extra: {
      solicitudId: requestId,
      tipo: "requestProfileChange",
      solicitante: user?.uid || user?.id || user?.nomina || null,
      nombreSolicitante: solicitorName,
      cambios: Object.keys(changes || {}),
    },
    enviado: false,
    fechaCreacion: FieldValue.serverTimestamp(),
    fechaEnviado: null,
  };

  const batch = db.batch();
  adminSnapshot.docs.forEach((adminDoc) => {
    const adminData = adminDoc.data() || {};
    const adminUserId = adminData.uid || adminDoc.id;

    if (!adminUserId) return;

    const notificationRef = notificationsCollection.doc();
    batch.set(notificationRef, {
      ...notificationBase,
      IdUsuario: adminUserId,
    });
  });

  await batch.commit();
  return { success: true, count: adminSnapshot.size };
};

// CREAR SOLICITUD { OPERADOR }
exports.requestProfileChange = onCall(async (request) => {
  const { user, changes } = request.data || {};

  if (!user?.nomina && !user?.nominaUsuario && !user?.numeroNomina && !user?.numeroDeNomina && !user?.nominaEmpleado) {
    throw new HttpsError("failed-precondition", "El usuario no tiene número de nómina.");
  }

  const normalizedUserNomina = normalizeNomina(
    user?.nomina ?? user?.nominaUsuario ?? user?.numeroNomina ?? user?.numeroDeNomina ?? user?.nominaEmpleado
  );

  if (!normalizedUserNomina) {
    throw new HttpsError("failed-precondition", "El usuario no tiene número de nómina válido.");
  }

  const datosSol = {};
  if (changes && typeof changes === "object") {
    CAMPOS_SOLICITABLES.forEach((campo) => {
      if (changes[campo] !== undefined) {
        const value = changes[campo];
        if (campo === "nomina" && value !== "" && value !== null && value !== undefined) {
          const numeric = Number(String(value).trim());
          datosSol[campo] = Number.isFinite(numeric) ? numeric : String(value).trim();
          return;
        }

        datosSol[campo] = typeof value === "string" ? value.trim() : value;
      }
    });
  }

  const docRef = await requestCollection.add({
    idUsuario: user.uid || user.id || null,
    uid: user.uid || user.id || null,
    nominaActual: normalizedUserNomina,
    nombreActual: user.nombre || "",
    rol: user.rol || "",
    fechaSolicitud: FieldValue.serverTimestamp(),
    estado: "Pendiente",
    datosActuales: snapshotCampos(user),
    datosSolicitados: datosSol,
    comentariosAdministrador: "",
    fechaRevision: null,
    administradorRevision: null,
  });

  await notifyAdminsOfProfileChangeRequest({
    requestId: docRef.id,
    user,
    changes: datosSol,
  });

  return { success: true, id: docRef.id };
});

// MIS SOLICITUDES { OPERADOR }
exports.getUserRequests = onCall(async (request) => {
  const { nomina, id, uid } = request.data || {};
  const authUid = request?.auth?.uid;

  // Si no viene nomina, intentar obtenerla de Firestore por uid
  let normalizedNomina = normalizeNomina(nomina);

  if (!normalizedNomina && authUid) {
    try {
      const userDoc = await db.collection("users").doc(authUid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        normalizedNomina = normalizeNomina(
          userData.nomina || userData.nominaUsuario || userData.numeroNomina
        );
      }
    } catch (err) {
      console.error("Error obteniendo nomina del usuario:", err);
      return [];
    }
  }

  if (!normalizedNomina) return [];

  try {
    const snapshot = await requestCollection
      .where("nominaActual", "==", normalizedNomina)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const fechaA = a.fechaSolicitud?.toMillis?.() ?? 0;
        const fechaB = b.fechaSolicitud?.toMillis?.() ?? 0;
        return fechaB - fechaA;
      });
  } catch (err) {
    console.error("Error en getUserRequests:", err);
    return [];
  }
});

// LISTAR SOLICITUDES { ADMINISTRADOR }
exports.getAllRequests = onCall(async () => {
  const snapshot = await requestCollection.orderBy("fechaSolicitud", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.getPendingRequests = onCall(async () => {
  const snapshot = await requestCollection
    .where("estado", "==", "Pendiente")
    .orderBy("fechaSolicitud", "desc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

// APROBAR SOLICITUDES { ADMINISTRADOR }
exports.approveRequest = onCall(async (request) => {
  const { requestId, administradorRevision } = request.data || {};

  if (!requestId) {
    throw new HttpsError("invalid-argument", "Falta el identificador de la solicitud.");
  }

  const requestRef = requestCollection.doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw new HttpsError("not-found", "La solicitud no existe.");
  }

  const solicitud = requestSnap.data();
  const datosSolicitados = { ...(solicitud.datosSolicitados || {}) };

  if (datosSolicitados.nomina !== undefined && datosSolicitados.nomina !== null && datosSolicitados.nomina !== "") {
    const numeric = Number(String(datosSolicitados.nomina).trim());
    datosSolicitados.nomina = Number.isFinite(numeric) ? numeric : String(datosSolicitados.nomina).trim();
  }

  const result = await updateUserFieldsByNomina(solicitud.nominaActual, datosSolicitados);

  if (!result.success) {
    return result;
  }

  await requestRef.update({
    estado: "Aprobada",
    fechaRevision: FieldValue.serverTimestamp(),
    administradorRevision: administradorRevision || null,
    comentariosAdministrador: solicitud.comentariosAdministrador || "",
  });

  await createRequestNotification({
    userId: solicitud.uid || null,
    title: "✅ Solicitud aprobada",
    message: "Tu solicitud de cambio fue aprobada y ya quedó actualizada en tu perfil.",
    destino: "solicitudes",
    accion: "solicitud_aprobada",
    extra: {
      solicitudId: requestId,
      estado: "Aprobada",
    },
  });

  await clearProfileRequestAdminNotifications(requestId);

  return { success: true, data: result.data };
});

// RECHAZAR SOLICITUDES { ADMINISTRADOR }
exports.rejectRequest = onCall(async (request) => {
  const { requestId, administradorRevision, comentario } = request.data || {};

  if (!requestId) {
    throw new HttpsError("invalid-argument", "Falta el identificador de la solicitud.");
  }

  const requestRef = requestCollection.doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw new HttpsError("not-found", "La solicitud no existe.");
  }

  const solicitud = requestSnap.data();

  await requestRef.update({
    estado: "Rechazada",
    comentariosAdministrador: comentario || "",
    fechaRevision: FieldValue.serverTimestamp(),
    administradorRevision: administradorRevision || null,
  });

  await createRequestNotification({
    userId: solicitud.uid || null,
    title: "❌ Solicitud rechazada",
    message: `Tu solicitud de cambio fue rechazada. Motivo: ${comentario || "Sin comentario"}`,
    destino: "solicitudes",
    accion: "solicitud_rechazada",
    extra: {
      solicitudId: requestId,
      estado: "Rechazada",
      motivo: comentario || "",
    },
  });

  await clearProfileRequestAdminNotifications(requestId);

  return { success: true };
});

// ELIMINAR SOLICITUDES { ADMINISTRADOR }
exports.eliminarSolicitud = onCall(async (request) => {
  const { requestId } = request.data || {};

  if (!requestId) {
    throw new HttpsError("invalid-argument", "Falta el identificador de la solicitud.");
  }

  const requestRef = requestCollection.doc(requestId);
  const snapshot = await requestRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "La solicitud no existe.");
  }

  const solicitud = snapshot.data();

  if (solicitud.estado === "Aprobada") {
    throw new HttpsError("failed-precondition", "No se puede eliminar una solicitud aprobada.");
  }

  await requestRef.delete();
  return { success: true };
});