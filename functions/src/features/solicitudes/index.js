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

const createRequestNotification = async ({ userId, title, message, destino = "solicitudes", accion = null, extra = {} }) => {
  if (!userId) return null;

  const notificationRef = await notificationsCollection.add({
    IdUsuario: userId,
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

  return { success: true, id: docRef.id };
});

// MIS SOLICITUDES { OPERADOR }
exports.getUserRequests = onCall(async (request) => {
  const { nomina } = request.data || {};
  const normalizedNomina = normalizeNomina(nomina);

  if (!normalizedNomina) return [];

  const snapshot = await requestCollection
    .where("nominaActual", "==", normalizedNomina)
    .orderBy("fechaSolicitud", "desc")
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const fechaA = a.fechaSolicitud?.toMillis?.() ?? 0;
      const fechaB = b.fechaSolicitud?.toMillis?.() ?? 0;
      return fechaB - fechaA;
    });
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
    userId: solicitud.idUsuario || solicitud.uid || null,
    title: "✅ Solicitud aprobada",
    message: "Tu solicitud de cambio fue aprobada y ya quedó actualizada en tu perfil.",
    destino: "solicitudes",
    accion: "solicitud_aprobada",
    extra: {
      solicitudId: requestId,
      estado: "Aprobada",
    },
  });

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
    userId: solicitud.idUsuario || solicitud.uid || null,
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