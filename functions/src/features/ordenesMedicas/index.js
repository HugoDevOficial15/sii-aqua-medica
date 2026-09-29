const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const ordenesMedicasCollection = db.collection("ordenes_medicas");
const usersCollection = db.collection("users");
const notificacionesCollection = db.collection("notificaciones");

const normalizeString = (value, fallback = "") => {
  const text = String(value ?? fallback ?? "").trim();
  return text || fallback;
};

const parseNomina = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const sortByFechaAperturaDesc = (items = []) => {
  return [...items].sort((a, b) => {
    const aDate = a?.fechaApertura ? new Date(a.fechaApertura).getTime() : 0;
    const bDate = b?.fechaApertura ? new Date(b.fechaApertura).getTime() : 0;
    return bDate - aDate;
  });
};

const getUserDocIdByUid = async (uid) => {
  if (!uid) return null;

  const snapshot = await usersCollection.where("uid", "==", uid).limit(1).get();
  if (snapshot.empty) return null;

  return snapshot.docs[0].id;
};

const getUserProfileByNomina = async (nomina) => {
  const nominaNum = parseNomina(nomina);
  const queries = [];

  if (nominaNum !== null) {
    queries.push(usersCollection.where("nomina", "==", nominaNum).limit(1));
  }

  const normalized = String(nomina ?? "").trim();
  if (normalized) {
    queries.push(usersCollection.where("nomina", "==", normalized).limit(1));
  }

  for (const queryRef of queries) {
    const snapshot = await queryRef.get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }

  return null;
};

const notifyAdmins = async (titulo, mensaje, destino = "detalle-orden-medico", extra = {}) => {
  const adminsSnap = await usersCollection.where("rol", "in", ["admin_medico", "admin_sistemas", "admin_area", "admin_sist", "admin_super"]).get();

  await Promise.all(
    adminsSnap.docs.map(async (adminDoc) => {
      const admin = adminDoc.data() || {};
      const adminUid = admin.uid || adminDoc.id;

      if (!adminUid) return null;

      return notificacionesCollection.add({
        IdUsuario: adminUid,
        Titulo: titulo,
        Mensaje: mensaje,
        Destino: destino,
        Accion: extra?.Accion || "",
        leida: false,
        extra: extra || {},
        createdAt: FieldValue.serverTimestamp(),
      });
    })
  );
};

const notifyUser = async (userId, titulo, mensaje, destino = "expediente-clinico", extra = {}) => {
  if (!userId) return null;

  return notificacionesCollection.add({
    IdUsuario: userId,
    Titulo: titulo,
    Mensaje: mensaje,
    Destino: destino,
    leida: false,
    extra: extra || {},
    tipo: "medico",
    fechaCreacion: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
};

exports.getMisOrdenesMedicas = onCall(async (request) => {
  const { userId } = request?.data ?? {};

  if (!userId) {
    throw new HttpsError("invalid-argument", "Se requiere un userId válido.");
  }

  const snapshot = await ordenesMedicasCollection.where("idPaciente", "==", userId).get();

  return {
    ordenes: sortByFechaAperturaDesc(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
  };
});

exports.createOrdenMedica = onCall(async (request) => {
  const payload = request?.data ?? {};
  const idPaciente = normalizeString(payload.idPaciente || payload.userId || payload.uid, "");

  if (!idPaciente) {
    throw new HttpsError("invalid-argument", "Falta el identificador del paciente.");
  }

  const docIdPaciente = payload.docIdPaciente || (await getUserDocIdByUid(idPaciente)) || idPaciente;
  const nominaPaciente = normalizeString(payload.nominaPaciente ?? payload.nomina ?? "");
  const nominaPacienteNum = parseNomina(nominaPaciente);

  const nuevaOrden = {
    idPaciente,
    docIdPaciente,
    nominaPaciente,
    nominaPacienteNum,
    nombrePaciente: normalizeString(payload.nombrePaciente || payload.nombre || payload.displayName || "Usuario AQUA"),
    areaPaciente: normalizeString(payload.areaPaciente || payload.area || ""),
    fechaApertura: payload.fechaApertura || new Date().toISOString(),
    estado: "Pendiente",
    tipoSangre: normalizeString(payload.tipoSangre || ""),
    peso: normalizeString(payload.peso || ""),
    estatura: normalizeString(payload.estatura || ""),
    alergias: normalizeString(payload.alergias || ""),
    enfermedadesCrónicas: normalizeString(payload.enfermedadesCrónicas || ""),
    telefonoEmergencia: normalizeString(payload.telefonoEmergencia || ""),
    revisiones: Array.isArray(payload.revisiones) ? payload.revisiones : [],
    esAtencionRapida: Boolean(payload.esAtencionRapida),
    createdAt: FieldValue.serverTimestamp(),
  };

  const docRef = await ordenesMedicasCollection.add(nuevaOrden);

  await notifyAdmins(
    "Nueva Orden Médica",
    `${nuevaOrden.nombrePaciente} (Nómina: ${nominaPaciente || "N/A"}) solicita consulta médica.`,
    "detalle-orden-medico",
    { tipo: "medico", Accion: "nueva_orden_medica" }
  );

  return {
    ok: true,
    id: docRef.id,
    orden: { id: docRef.id, ...nuevaOrden },
  };
});

exports.deleteOrdenMedica = onCall(async (request) => {
  const { id } = request?.data ?? {};

  if (!id) {
    throw new HttpsError("invalid-argument", "Falta el id de la orden médica.");
  }

  const docRef = ordenesMedicasCollection.doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "La orden médica no existe.");
  }

  const notifSnap = await notificacionesCollection.where("extra.idOrden", "==", id).get();
  const batch = db.batch();

  notifSnap.docs.forEach((notifDoc) => batch.delete(notifDoc.ref));
  batch.delete(docRef);
  await batch.commit();

  return { ok: true, id };
});

exports.getOrdenesMedicas = onCall(async () => {
  const snapshot = await ordenesMedicasCollection.get();

  return {
    ordenes: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
  };
});

exports.buscarOrdenesActivasPorPaciente = onCall(async (request) => {
  const { termino } = request?.data ?? {};
  const normalized = String(termino ?? "").trim();

  if (!normalized) {
    return { ordenes: [] };
  }

  const estadosActivos = ["Pendiente", "En Tratamiento"];
  const consultas = [
    ordenesMedicasCollection.where("nominaPaciente", "==", normalized).where("estado", "in", estadosActivos),
    ordenesMedicasCollection.where("nominaPaciente", "==", Number(normalized)).where("estado", "in", estadosActivos),
    ordenesMedicasCollection.where("nominaPAciente", "==", normalized).where("estado", "in", estadosActivos),
    ordenesMedicasCollection.where("nominaPAciente", "==", Number(normalized)).where("estado", "in", estadosActivos),
  ].filter(Boolean);

  const snapshots = await Promise.all(consultas.map((queryRef) => queryRef.get()));
  const resultados = new Map();

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((docSnap) => {
      if (!resultados.has(docSnap.id)) {
        resultados.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      }
    });
  });

  return { ordenes: Array.from(resultados.values()) };
});

exports.getUsuarioPorNomina = onCall(async (request) => {
  const { nomina } = request?.data ?? {};
  const usuario = await getUserProfileByNomina(nomina);

  if (!usuario) {
    throw new HttpsError("not-found", "No se encontró un usuario con esa nómina.");
  }

  return { usuario };
});

exports.getUsuarioByDocId = onCall(async (request) => {
  const { docId } = request?.data ?? {};

  if (!docId) {
    throw new HttpsError("invalid-argument", "Falta el docId del usuario.");
  }

  const snapshot = await usersCollection.doc(String(docId)).get();
  if (!snapshot.exists) {
    return { usuario: null };
  }

  return { usuario: { id: snapshot.id, ...snapshot.data() } };
});

exports.crearOrdenAtencionRapida = onCall(async (request) => {
  const { nominaAtencionRapida } = request?.data ?? {};
  const rawNomina = String(nominaAtencionRapida ?? "").trim();

  if (!rawNomina) {
    throw new HttpsError("invalid-argument", "La nómina es obligatoria.");
  }

  const nominaNum = Number(rawNomina);
  if (Number.isNaN(nominaNum)) {
    throw new HttpsError("invalid-argument", "La nómina debe ser un número válido.");
  }

  const snapshotActivos = await ordenesMedicasCollection
    .where("nominaPacienteNum", "==", nominaNum)
    .where("estado", "in", ["Pendiente", "En Tratamiento"])
    .limit(1)
    .get();

  if (!snapshotActivos.empty) {
    const ordenExistente = snapshotActivos.docs[0];
    return { ok: true, orden: { id: ordenExistente.id, ...ordenExistente.data() }, created: false };
  }

  const usuario = await getUserProfileByNomina(rawNomina);
  if (!usuario) {
    throw new HttpsError("not-found", "No se encontró un usuario con esa nómina en el sistema.");
  }

  const docIdPaciente = usuario.id || usuario.docId || usuario.uid || null;
  const nuevaOrden = {
    idPaciente: usuario.uid || usuario.id,
    docIdPaciente,
    nominaPaciente: rawNomina,
    nominaPacienteNum: nominaNum,
    nombrePaciente: usuario.displayName || usuario.nombre || "Usuario",
    areaPaciente: usuario.area || "",
    fechaApertura: new Date().toISOString(),
    estado: "Pendiente",
    tipoSangre: usuario.tipoSangre || "",
    peso: usuario.peso || "",
    estatura: usuario.estatura || "",
    alergias: usuario.alergias || "",
    enfermedadesCrónicas: usuario.enfermedadesCrónicas || "",
    telefonoEmergencia: usuario.telefonoEmergencia || "",
    revisiones: [],
    esAtencionRapida: true,
    createdAt: FieldValue.serverTimestamp(),
  };

  const ref = await ordenesMedicasCollection.add(nuevaOrden);

  await notifyAdmins(
    "Nueva Orden Médica",
    `Paciente ${nuevaOrden.nombrePaciente} fue registrado para atención rápida con nómina ${rawNomina}.`,
    "detalle-orden-medico",
    { tipo: "medico", Accion: "nueva_orden_medica" }
  );

  return { ok: true, orden: { id: ref.id, ...nuevaOrden }, created: true };
});

exports.guardarRevisionOrdenMedica = onCall(async (request) => {
  const payload = request?.data ?? {};
  const { ordenId, esAltaMedica = false, comentarios, medicamentos, tipoSangre, peso, estatura, alergias, enfermedadesCrónicas, telefonoEmergencia, ordenCargada } = payload;

  if (!ordenId) {
    throw new HttpsError("invalid-argument", "Falta el id de la orden médica.");
  }

  if (!comentarios || !String(comentarios).trim()) {
    throw new HttpsError("invalid-argument", "Los comentarios de la revisión son obligatorios.");
  }

  const nuevaRevision = {
    fechaRevision: new Date().toISOString(),
    comentarios: String(comentarios).trim(),
    medicamentos: String(medicamentos || "Sin medicamentos recetados").trim(),
    firmaBiometrica: true,
    tipo: esAltaMedica ? "Alta" : "Revisión Rutina",
  };

  const ordenRef = ordenesMedicasCollection.doc(ordenId);
  const ordenSnapshot = await ordenRef.get();

  if (!ordenSnapshot.exists) {
    throw new HttpsError("not-found", "La orden médica no existe.");
  }

  const current = ordenSnapshot.data() || {};
  const updates = {
    revisiones: FieldValue.arrayUnion(nuevaRevision),
    estado: esAltaMedica ? "Cerrada" : "En Tratamiento",
    tipoSangre: normalizeString(tipoSangre || current.tipoSangre || ""),
    peso: normalizeString(peso || current.peso || ""),
    estatura: normalizeString(estatura || current.estatura || ""),
    alergias: normalizeString(alergias || current.alergias || ""),
    enfermedadesCrónicas: normalizeString(enfermedadesCrónicas || current.enfermedadesCrónicas || ""),
    telefonoEmergencia: normalizeString(telefonoEmergencia || current.telefonoEmergencia || ""),
    ...(esAltaMedica && { fechaCierre: new Date().toISOString() }),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ordenRef.update(updates);

  const docIdUsuario = current.docIdPaciente || current.idPaciente;
  if (docIdUsuario) {
    const userRef = usersCollection.doc(String(docIdUsuario));
    await userRef.update({
      tipoSangre: updates.tipoSangre,
      peso: updates.peso,
      estatura: updates.estatura,
      alergias: updates.alergias,
      enfermedadesCrónicas: updates.enfermedadesCrónicas,
      telefonoEmergencia: updates.telefonoEmergencia,
    }).catch(() => null);
  }

  if (current.idPaciente) {
    await notifyUser(
      current.idPaciente,
      esAltaMedica ? "¡Alta Médica Aprobada! 🩺" : "Actualización en tu Consulta",
      esAltaMedica ? "El médico ha concluido tu orden médica y te ha dado de alta." : `Nuevo diagnóstico o receta agregada: "${comentarios.substring(0, 40)}..."`,
      "expediente-clinico",
      { tipo: "medico", orderId: ordenId }
    );
  }

  const adminRoles = ["admin_area", "admin_medico", "admin_sistemas", "admin_sist", "admin_super"];
  const adminSnap = await usersCollection.where("rol", "in", adminRoles).get();

  const areaPaciente = current.areaPaciente || ordenCargada?.areaPaciente || "";
  const adminsANotificar = adminSnap.docs.filter((adminDoc) => {
    const admin = adminDoc.data() || {};
    if (!areaPaciente) return true;
    return !admin.area || admin.area === areaPaciente;
  });

  await Promise.all(
    adminsANotificar.map(async (adminDoc) => {
      const admin = adminDoc.data() || {};
      const adminUid = admin.uid || adminDoc.id;
      if (!adminUid) return null;

      return notificacionesCollection.add({
        IdUsuario: adminUid,
        Titulo: esAltaMedica ? "Paciente Dado de Alta" : "Orden Médica Actualizada",
        Mensaje: esAltaMedica
          ? `Paciente ${current.nombrePaciente} ha sido dado de alta en el área ${areaPaciente || "general"}.`
          : `Se ha actualizado la orden médica del paciente ${current.nombrePaciente}.`,
        Destino: esAltaMedica ? "personal" : "detalle-orden-medico",
        leida: false,
        fechaCreacion: FieldValue.serverTimestamp(),
        tipo: "medico",
        orderId: ordenId,
      });
    })
  );

  return {
    ok: true,
    orden: { id: ordenId, ...current, ...updates },
  };
});

exports.eliminarOrdenMedicaAdmin = onCall(async (request) => {
  const { ordenId } = request?.data ?? {};

  if (!ordenId) {
    throw new HttpsError("invalid-argument", "Falta el id de la orden médica.");
  }

  const ordenRef = ordenesMedicasCollection.doc(ordenId);
  const ordenSnap = await ordenRef.get();

  if (!ordenSnap.exists) {
    throw new HttpsError("not-found", "La orden médica no existe.");
  }

  const notifSnap = await notificacionesCollection.where("extra.idOrden", "==", ordenId).get();
  const batch = db.batch();

  notifSnap.docs.forEach((notifDoc) => batch.delete(notifDoc.ref));
  batch.delete(ordenRef);
  await batch.commit();

  return { ok: true, id: ordenId };
});
