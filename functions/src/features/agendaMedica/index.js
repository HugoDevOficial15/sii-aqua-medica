const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const agendaMedicaCollection = db.collection("agendas_medicas");
const BATCH_LIMIT = 450;

const normalizeAgendaPayload = (payload = {}) => {
  const data = payload || {};

  const normalized = {
    nombre: String(data.nombre ?? "").trim(),
    fechaInicio: String(data.fechaInicio ?? "").trim(),
    fechaFin: String(data.fechaFin ?? "").trim(),
    duracionMin: Number(data.duracionMin ?? 30),
    horarios: data.horarios ?? {},
    diasBloqueados: Array.isArray(data.diasBloqueados) ? data.diasBloqueados : [],
  };

  if (data.agendaId && !normalized.agendaId) {
    normalized.agendaId = data.agendaId;
  }

  return normalized;
};

const generarHoras = (inicio, fin, duracion) => {
  const result = [];
  let [h, m] = inicio.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);

  while (h < fh || (h === fh && m < fm)) {
    const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    m += duracion;

    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }

    const end = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    result.push({ inicio: start, fin: end });
  }

  return result;
};

const notifyActiveOperators = async (agendaId, nombre) => {
  const snap = await db.collection("users").where("rol", "==", "operador").get();

  await Promise.all(
    snap.docs
      .filter((docSnap) => docSnap.data()?.activo === true)
      .map(async (userDoc) => {
        const userId = userDoc.id;

        await db.collection("notificaciones").add({
          IdUsuario: userId,
          Titulo: "📅 Nueva agenda médica",
          Mensaje: `Se creó la campaña: "${nombre}". Revisa los horarios disponibles.`,
          Destino: "citas-medicas",
          extra: {
            NomAgenda: nombre,
            agendaId,
          },
          createdAt: FieldValue.serverTimestamp(),
        });
      })
  );
};

exports.getAgendasMedicas = onCall(async (request) => {
  const { estado = null } = request?.data ?? {};

  let queryRef = agendaMedicaCollection;
  if (estado !== null && estado !== undefined && estado !== "") {
    queryRef = queryRef.where("estado", "==", estado);
  }

  const snapshot = await queryRef.get();

  return {
    agendas: snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const { id: _ignoredId, agendaId: _ignoredAgendaId, ...rest } = data;
      const fallbackId = data.id ?? data.agendaId ?? data.docId ?? data._id ?? docSnap.id;

      return {
        id: docSnap.id,
        agendaId: fallbackId,
        docId: docSnap.id,
        _id: docSnap.id,
        ...rest,
      };
    }),
  };
});

exports.crearAgenda = onCall(async (request) => {
  const payload = normalizeAgendaPayload(request?.data ?? {});

  if (!payload.nombre || !payload.fechaInicio || !payload.fechaFin) {
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios para crear la agenda.");
  }

  const docRef = await agendaMedicaCollection.add({
    ...payload,
    estado: "activa",
    createdAt: FieldValue.serverTimestamp(),
  });

  await notifyActiveOperators(docRef.id, payload.nombre);

  return { ok: true, id: docRef.id };
});

exports.generateAgendaSlots = onCall(async (request) => {
  const agenda = request?.data ?? {};
  const payload = normalizeAgendaPayload(agenda);
  const agendaId = payload.id ?? payload.agendaId;

  if (!payload.fechaInicio || !payload.fechaFin || !agendaId) {
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios para generar la agenda.");
  }

  let current = new Date(`${payload.fechaInicio}T12:00:00`);
  const end = new Date(`${payload.fechaFin}T12:00:00`);
  const batch = db.batch();
  let batchSize = 0;
  let totalGenerados = 0;

  const commitBatch = async () => {
    if (batchSize === 0) return;
    await batch.commit();
    batchSize = 0;
  };

  while (current <= end) {
    const dia = current.getDay();
    const fechaStr = current.toISOString().split("T")[0];

    if (dia >= 1 && dia <= 5 && !(payload.diasBloqueados || []).includes(fechaStr)) {
      const rangos = payload.horarios?.[dia] || [];

      for (const rango of rangos) {
        if (!rango?.inicio || !rango?.fin) continue;

        const bloques = generarHoras(rango.inicio, rango.fin, payload.duracionMin || 30);

        for (const bloque of bloques) {
          const citaRef = db.collection("citas_medicas").doc();
          batch.set(citaRef, {
            agendaId: agendaId,
            fecha: fechaStr,
            horaInicio: bloque.inicio,
            horaFin: bloque.fin,
            estado: "libre",
            usuarioId: null,
            usuarioNombre: null,
            observacion: null,
            anio: current.getFullYear(),
            mes: current.getMonth() + 1,
            createdAt: FieldValue.serverTimestamp(),
          });

          batchSize += 1;
          totalGenerados += 1;

          if (batchSize >= BATCH_LIMIT) {
            await commitBatch();
          }
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  await commitBatch();

  return {
    ok: true,
    total: totalGenerados,
  };
});

exports.toggleAgendaEstado = onCall(async (request) => {
  const { id, estadoActual } = request?.data ?? {};

  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la agenda.");
  }

  const nuevoEstado = estadoActual === "activa" ? "inactiva" : "activa";
  await agendaMedicaCollection.doc(id).update({ estado: nuevoEstado });

  return { ok: true, estado: nuevoEstado };
});

exports.updateAgenda = onCall(async (request) => {
  const { id, agendaUpdates = {} } = request?.data ?? {};

  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la agenda.");
  }

  const updates = normalizeAgendaPayload(agendaUpdates);

  const { id: _id, agendaId: _agendaId, ...safeUpdates } = updates;

  await agendaMedicaCollection.doc(id).update({
    ...safeUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, id };
});

exports.deleteAgenda = onCall(async (request) => {
  const { id, nombre = "" } = request?.data ?? {};

  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la agenda.");
  }

  const batch = db.batch();

  const citasSnap = await db.collection("citas_medicas").where("agendaId", "==", id).get();
  citasSnap.docs.forEach((citaDoc) => batch.delete(citaDoc.ref));

  const notifSnap = await db.collection("notificaciones").where("NomAgenda", "==", nombre).get();
  notifSnap.docs.forEach((notifDoc) => batch.delete(notifDoc.ref));

  batch.delete(agendaMedicaCollection.doc(id));
  await batch.commit();

  return { ok: true, citasEliminadas: citasSnap.docs.length };
});

exports.updateAgendaWithBatch = onCall(async (request) => {
  const { agendaId, agendaUpdates = {}, motivo = "", adminUid = null } = request?.data ?? {};

  if (!agendaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la agenda.");
  }

  const batch = db.batch();
  const updates = { ...agendaUpdates, updatedAt: FieldValue.serverTimestamp() };

  batch.update(agendaMedicaCollection.doc(agendaId), updates);

  const citasSnap = await db
    .collection("citas_medicas")
    .where("agendaId", "==", agendaId)
    .where("estado", "in", ["activa", "pendiente", "reservado"])
    .get();

  const citasACancelar = [];

  citasSnap.docs.forEach((citaDoc) => {
    const cita = citaDoc.data() || {};
    batch.update(citaDoc.ref, {
      estado: "cancelada_por_admin",
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
      await db.collection("notificaciones").add({
        IdUsuario: idUsuario,
        Titulo: "Cita cancelada",
        Mensaje: `La agenda médica fue modificada por el administrador. Tu cita ha sido cancelada.\n\nMotivo:\n${motivoCancelacion}\n\nPor favor agenda una nueva cita.`,
        Destino: "CitaCancelada",
        createdAt: FieldValue.serverTimestamp(),
      });
    })
  );

  return { success: true, citasCanceladas: citasSnap.docs.length };
});

    