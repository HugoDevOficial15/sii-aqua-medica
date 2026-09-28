const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const CITA_ESTADOS = {
  ACTIVA: "activa",
  CANCELADA_USUARIO: "cancelada_por_usuario",
  CANCELADA_ADMIN: "cancelada_por_admin",
  ATENDIDA: "atendida",
  FINALIZADA: "finalizada",
  EXPIRADA: "expirada",
};

const ESTADOS_CANCELABLES = [CITA_ESTADOS.ACTIVA, "pendiente", "reservado"];
const ESTADOS_OCUPADOS = [CITA_ESTADOS.ACTIVA, "pendiente", "reservado"];

const normalizeCitaListado = (snapshot) =>
  snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

const resolveUserDocIdByFirebaseUid = async (userId) => {
  if (!userId) return null;

  try {
    const usersSnap = await db
      .collection("users")
      .where("uid", "==", userId)
      .limit(1)
      .get();

    if (!usersSnap.empty) {
      return usersSnap.docs[0].id;
    }
  } catch (error) {
    console.error("Error resolviendo docId del usuario para citas:", error);
  }

  return userId;
};

const createNotification = async ({
  IdUsuario,
  Titulo,
  Mensaje,
  Destino = null,
  Accion = null,
  extra = {},
}) => {
  if (!IdUsuario) {
    throw new Error("IdUsuario es requerido para crear una notificación");
  }

  if (!Titulo || !Mensaje) {
    throw new Error("Titulo y Mensaje son requeridos");
  }

  const notificationData = {
    IdUsuario,
    Titulo,
    Mensaje,
    Destino: Destino || null,
    Accion: Accion || null,
    enviado: false,
    fechaCreacion: FieldValue.serverTimestamp(),
    fechaEnviado: null,
    ...extra,
  };

  const ref = await db.collection("notificaciones").add(notificationData);

  return {
    id: ref.id,
    ...notificationData,
  };
};

exports.notifyAdminsForAppointmentEvent = onCall(async (request) => {
  const {
    titulo,
    mensaje,
    destino = "citas-medicas",
    accion = "cita_agendada",
    extra = {},
    rolesPermitidos = ["admin_medico", "admin_sistemas", "admin", "administrador", "admin_general"],
  } = request?.data ?? {};

  if (!titulo || !mensaje) {
    throw new HttpsError("invalid-argument", "Falta titulo o mensaje para la notificación.");
  }

  const adminSnap = await db
    .collection("users")
    .where("rol", "in", rolesPermitidos)
    .limit(100)
    .get();

  const admins = adminSnap.docs
    .map((docSnap) => ({
      uid: docSnap.data()?.uid || docSnap.id,
      ...docSnap.data(),
    }))
    .filter((admin) => !!(admin.uid || admin.id));

  const createdNotifications = [];

  for (const admin of admins) {
    const adminUid = admin.uid || admin.id;
    if (!adminUid) continue;

    createdNotifications.push(
      createNotification({
        IdUsuario: adminUid,
        Titulo: titulo,
        Mensaje: mensaje,
        Destino: destino,
        Accion: accion,
        extra,
      })
    );
  }

  await Promise.all(createdNotifications);

  return {
    ok: true,
    enviados: createdNotifications.length,
  };
});

exports.getCitasMedicas = onCall(async (request) => {
  const { agendaId = null, userId = null, estado = null } = request?.data ?? {};

  let queryRef = db.collection("citas_medicas");

  if (agendaId) {
    queryRef = queryRef.where("agendaId", "==", agendaId);
  }

  if (userId) {
    queryRef = queryRef.where("userId", "==", userId);
  }

  if (estado) {
    queryRef = queryRef.where("estado", "==", estado);
  }

  const snap = await queryRef.get();

  return {
    citas: normalizeCitaListado(snap),
  };
});

exports.atenderCita = onCall(async (request) => {
  const { id, observacion = "" } = request?.data ?? {};

  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la cita.");
  }

  await db.collection("citas_medicas").doc(id).update({
    estado: CITA_ESTADOS.ATENDIDA,
    observacion,
  });

  return { ok: true };
});

exports.cancelarCitaPorAdmin = onCall(async (request) => {
  const { citaId, motivo, adminUid = null, adminNombre = null } = request?.data ?? {};

  if (!citaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la cita.");
  }

  const citaRef = db.collection("citas_medicas").doc(citaId);
  const citaSnap = await citaRef.get();

  if (!citaSnap.exists) {
    throw new HttpsError("not-found", "La cita no existe");
  }

  const cita = citaSnap.data() || {};
  const tieneUsuario = !!(cita.userId || cita.usuarioId || cita.nominaUsuario);

  const updateData = {
    estado: CITA_ESTADOS.CANCELADA_ADMIN,
    motivoCancelacion: motivo,
    fechaCancelacion: FieldValue.serverTimestamp(),
    agendaId: cita.agendaId,
  };

  if (adminUid) {
    updateData.canceladaPor = adminUid;
  }

  if (adminNombre) {
    updateData.nombreAdminCancelacion = adminNombre;
  }

  await citaRef.update(updateData);

  if (tieneUsuario) {
    const idUsuario = cita.userId || cita.usuarioId;
    const fecha = cita.fecha;
    const hora = cita.horaInicio || cita.hora;
    const agendaNombre = cita.agendaNombre || "la campaña médica";
    const agendaId = cita.agendaId;

    try {
      await createNotification({
        IdUsuario: idUsuario,
        Titulo: "📅 Cita Cancelada por Administrador",
        Mensaje: `Tu cita del ${fecha} a las ${hora} en "${agendaNombre}" ha sido cancelada.\n\nMotivo: ${motivo}\n\nPuedes agendar un nuevo horario en la misma campaña.`,
        Destino: "medical-appointments",
        Accion: "cita_cancelada_admin",
        extra: {
          citaId,
          agendaId,
          motivo,
          fecha,
          hora,
          permitirReagendar: true,
          enlaceReagendar: `/citas-medicas?reagendar=${agendaId}`,
        },
      });
    } catch (error) {
      console.error(`Error notificando al usuario ${idUsuario}:`, error);
    }
  }

  return { ok: true };
});

exports.getCitasPorAgenda = onCall(async (request) => {
  const { agendaId } = request?.data ?? {};

  if (!agendaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la agenda.");
  }

  const snap = await db
    .collection("citas_medicas")
    .where("agendaId", "==", agendaId)
    .get();

  return {
    citas: normalizeCitaListado(snap),
  };
});

exports.getUserAppointments = onCall(async (request) => {
  const { nomina, userId } = request?.data ?? {};

  if (!userId && !nomina) {
    throw new HttpsError("invalid-argument", "Se requiere el ID de usuario o nómina para obtener citas.");
  }

  let snap;

  if (userId) {
    snap = await db.collection("citas_medicas").where("userId", "==", userId).get();
  } else {
    snap = await db.collection("citas_medicas").where("nominaUsuario", "==", nomina).get();
  }

  let misCitas = normalizeCitaListado(snap);

  if (userId) {
    const paramUserId = String(userId).trim();
    misCitas = misCitas.filter((cita) => {
      if (!cita.userId) return false;
      return String(cita.userId).trim() === paramUserId;
    });
  } else {
    const paramNomina = String(nomina).trim();
    misCitas = misCitas.filter((cita) => String(cita.nominaUsuario || "").trim() === paramNomina);
  }

  for (let i = 0; i < misCitas.length; i += 1) {
    const cita = misCitas[i];

    try {
      if (cita.agendaId) {
        const agendaSnap = await db.collection("agendas_medicas").doc(cita.agendaId).get();
        misCitas[i] = {
          ...cita,
          agendaNombre: agendaSnap.exists ? agendaSnap.data()?.nombre ?? null : null,
        };
      } else {
        misCitas[i] = { ...cita, agendaNombre: null };
      }
    } catch (_error) {
      misCitas[i] = { ...cita, agendaNombre: null };
    }
  }

  misCitas = misCitas
    .filter((cita) => cita.estado === CITA_ESTADOS.ACTIVA)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  return { citas: misCitas };
});

exports.cancelAppointmentByUser = onCall(async (request) => {
  const { citaId, user, motivo } = request?.data ?? {};

  if (!citaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la cita.");
  }

  const citaRef = db.collection("citas_medicas").doc(citaId);

  await citaRef.update({
    estado: CITA_ESTADOS.CANCELADA_USUARIO,
    motivoCancelacion: motivo,
    fechaCancelacion: FieldValue.serverTimestamp(),
    canceladaPor: user?.uid || null,
    nominaCancelada: user?.nomina || null,
  });

  if (user?.uid) {
    await createNotification({
      IdUsuario: user.uid,
      Titulo: "Cita cancelada",
      Mensaje: "Tu cancelación fue registrada correctamente.",
      Destino: "CitaCanceladaConfirmacion",
    });
  }

  return { ok: true };
});

exports.cancelAppointmentsByAgenda = onCall(async (request) => {
  const { agendaId, motivo, adminUid } = request?.data ?? {};

  if (!agendaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la agenda.");
  }

  const snap = await db
    .collection("citas_medicas")
    .where("agendaId", "==", agendaId)
    .where("estado", "in", ESTADOS_CANCELABLES)
    .get();

  const batch = db.batch();
  const citasACancelar = [];

  snap.docs.forEach((citaDoc) => {
    const cita = citaDoc.data() || {};

    batch.update(citaDoc.ref, {
      estado: CITA_ESTADOS.CANCELADA_ADMIN,
      motivoCancelacion: motivo,
      fechaCancelacion: FieldValue.serverTimestamp(),
      canceladaPor: adminUid,
      agendaModificada: true,
    });

    const idUsuario = cita.userId || cita.usuarioId;
    if (idUsuario) {
      citasACancelar.push({ idUsuario, motivo });
    }
  });

  await batch.commit();

  await Promise.all(
    citasACancelar.map(async ({ idUsuario, motivo: motivoCancelacion }) => {
      try {
        await createNotification({
          IdUsuario: idUsuario,
          Titulo: "Cita cancelada",
          Mensaje: `La agenda médica fue modificada por el administrador. Tu cita ha sido cancelada.\n\nMotivo:\n${motivoCancelacion}\n\nPor favor agenda una nueva cita.`,
          Destino: "CitaCancelada",
        });
      } catch (error) {
        console.error(`Error creando notificación para usuario ${idUsuario}:`, error);
      }
    })
  );

  return { success: true, citasCanceladas: snap.docs.length };
});

exports.getAvailableSchedules = onCall(async (request) => {
  const {
    agendaId,
    fecha,
    bloquesPosibles = [],
    nominaUsuarioActual,
    userIdActual,
  } = request?.data ?? {};

  if (!agendaId || !fecha) {
    throw new HttpsError("invalid-argument", "Falta agenda o fecha para consultar disponibilidad.");
  }

  const snap = await db
    .collection("citas_medicas")
    .where("agendaId", "==", agendaId)
    .where("fecha", "==", fecha)
    .get();

  const horasOcupadas = new Set();
  const horasOcultasParaNomina = new Set();

  snap.docs.forEach((d) => {
    const cita = d.data() || {};
    const hora = cita.horaInicio || cita.hora;
    const estado = cita.estado;

    if (!hora) return;

    if (estado === CITA_ESTADOS.CANCELADA_USUARIO) {
      if (String(cita.nominaCancelada) === String(nominaUsuarioActual)) {
        horasOcultasParaNomina.add(hora);
      }
      return;
    }

    if (estado === CITA_ESTADOS.CANCELADA_ADMIN) {
      const usuarioAfectado = cita.userId || cita.usuarioId;
      if (userIdActual && String(usuarioAfectado) === String(userIdActual)) {
        horasOcultasParaNomina.add(hora);
      }
      return;
    }

    if (ESTADOS_OCUPADOS.includes(estado)) {
      horasOcupadas.add(hora);
    }
  });

  return {
    bloques: bloquesPosibles.filter((h) => !horasOcultasParaNomina.has(h)),
    ocupadas: Array.from(horasOcupadas),
  };
});

exports.bookAppointment = onCall(async (request) => {
  const {
    agendaId,
    fecha,
    horaInicio,
    userId,
    nominaUsuario,
    usuario,
    nombre,
    paciente,
  } = request?.data ?? {};

  if (!agendaId || !fecha || !horaInicio || !userId) {
    throw new HttpsError("invalid-argument", "Datos incompletos para agendar la cita.");
  }

  const campanaSnap = await db
    .collection("citas_medicas")
    .where("agendaId", "==", agendaId)
    .where("userId", "==", userId)
    .get();

  const citasActivas = campanaSnap.docs.filter((docSnap) => {
    const cita = docSnap.data() || {};
    return cita.estado === CITA_ESTADOS.ACTIVA;
  });

  if (citasActivas.length > 0) {
    throw new HttpsError("failed-precondition", "Ya tienes un turno asignado en esta campaña.");
  }

  const snapFecha = await db
    .collection("citas_medicas")
    .where("userId", "==", userId)
    .where("fecha", "==", fecha)
    .get();

  const citasEnMismaFecha = snapFecha.docs.filter((docSnap) => {
    const cita = docSnap.data() || {};
    return cita.estado === CITA_ESTADOS.ACTIVA;
  });

  if (citasEnMismaFecha.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      "Ya tienes una cita agendada en esta fecha. No puedes agendar dos citas en el mismo día."
    );
  }

  snapFecha.docs.forEach((docSnap) => {
    const cita = docSnap.data() || {};

    if (cita.estado !== CITA_ESTADOS.ACTIVA) {
      return;
    }

    const horaExistente = cita.horaInicio || cita.hora || "";
    if (horaExistente === horaInicio) {
      throw new HttpsError("failed-precondition", "Ya tienes otra cita agendada a esta misma hora.");
    }
  });

  const nuevaCita = {
    agendaId,
    fecha,
    horaInicio,
    hora: horaInicio,
    horario: horaInicio,
    time: horaInicio,
    userId,
    nominaUsuario: nominaUsuario || null,
    usuario: usuario || nombre || paciente || null,
    paciente: paciente || usuario || nombre || null,
    nombre: nombre || usuario || paciente || null,
    estado: CITA_ESTADOS.ACTIVA,
    createdAt: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("citas_medicas").add(nuevaCita);

  const resolvedUserDocId = await resolveUserDocIdByFirebaseUid(userId);
  if (resolvedUserDocId) {
    const anioActual = new Date().getFullYear();
    const userYearCitaRef = db
      .collection("users")
      .doc(String(resolvedUserDocId))
      .collection(String(anioActual))
      .doc("informacion")
      .collection("CitasMedicas")
      .doc();

    await userYearCitaRef.set({
      ...nuevaCita,
      id: userYearCitaRef.id,
      usuarioDocId: resolvedUserDocId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  try {
    await createNotification({
      IdUsuario: userId,
      Titulo: "📅 Cita Agendada",
      Mensaje: `Tu cita médica ha sido agendada para el ${fecha} a las ${horaInicio}`,
      Destino: "citas-medicas",
      Accion: "cita_agendada",
      extra: {
        citaId: docRef.id,
        fecha,
        horaInicio,
      },
    });
  } catch (error) {
    console.error("Error al notificar cita agendada:", error);
  }

  return {
    ok: true,
    cita: {
      id: docRef.id,
      ...nuevaCita,
    },
  };
});
