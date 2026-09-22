const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const reconocimientosCollection = db.collection("reconocimientos");
const incidenciasCollection = db.collection("incidencias_personal");
const incapacidadesCollection = db.collection("incapacidades");
const ordenesMedicasCollection = db.collection("ordenes_medicas");
const capacitacionesCollection = db.collection("capacitaciones");
const respuestasCapacitacionesCollection = db.collection("respuestasCapacitaciones");

const normalizeText = (value = "") => String(value ?? "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const normalizeArea = (value = "") => {
  const normalized = normalizeText(value);
  const aliases = {
    contabilidad: "contabilidad",
    "recursos humanos": "recursos humanos",
    "recursos_humanos": "recursos humanos",
    rrhh: "recursos humanos",
    produccion: "produccion",
    producci\u00f3n: "produccion",
    almacen: "almacen",
    almac\u00e9n: "almacen",
    mantenimiento: "mantenimiento",
    seguridad: "seguridad",
    "salud ocupacional": "salud ocupacional",
    salud_ocupacional: "salud ocupacional",
    validaciones: "validaciones",
    "comite tecnico": "comite tecnico",
    sistemas: "sistemas",
  };

  return aliases[normalized] || normalized;
};

const requireAuth = (request) => {
  if (!request?.auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar personal.");
  }
};

const uniqueValues = (values = []) => [...new Set(
  (Array.isArray(values) ? values : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean),
)];

const chunkArray = (items = [], size = 10) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.id || JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getProfileByAuth = async (request) => {
  const authUid = request?.auth?.uid;
  if (!authUid) return null;

  const byUid = await usersCollection.where("uid", "==", authUid).limit(1).get();
  if (!byUid.empty) {
    return { id: byUid.docs[0].id, ...byUid.docs[0].data() };
  }

  const byDoc = await usersCollection.doc(String(authUid)).get();
  if (byDoc.exists) {
    return { id: byDoc.id, ...byDoc.data() };
  }

  return null;
};

const getAllowedUsersForPersonal = (usuarios = [], usuarioActual = null) => {
  if (!usuarioActual) return [];

  const rolActual = normalizeText(usuarioActual.rol);
  const areaActual = normalizeArea(usuarioActual.area);

  if (rolActual === "admin_sistemas") {
    return (usuarios || []).filter((usuario) => {
      if (!usuario || usuario.activo === false) return false;
      return normalizeText(usuario.rol).includes("operador") && normalizeArea(usuario.area) === "sistemas";
    });
  }

  return (usuarios || []).filter((usuario) => {
    if (!usuario || usuario.activo === false) return false;
    return normalizeText(usuario.rol).includes("operador") && normalizeArea(usuario.area) === areaActual;
  });
};

const getPersonalUsers = async (request) => {
  requireAuth(request);

  const currentUser = await getProfileByAuth(request);
  if (!currentUser) {
    throw new HttpsError("unauthenticated", "No se encontró el perfil del usuario con sesión activa.");
  }

  const snapshot = await usersCollection.get();
  const allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return getAllowedUsersForPersonal(allUsers, currentUser);
};

const queryCollectionByFieldIn = async (collectionRef, field, values = []) => {
  const normalizedValues = uniqueValues(values).filter((value) => value !== "");
  if (!normalizedValues.length) return [];

  const chunks = chunkArray(normalizedValues, 10);
  const snapshots = await Promise.all(
    chunks.map((chunk) => collectionRef.where(field, "in", chunk).get()),
  );

  return snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
};

const queryNestedTrainingResponsesByUsers = async (userIds = [], nominas = []) => {
  const trainingDocs = await capacitacionesCollection.get();
  const bucketNames = ["pendientes", "aprobados", "reprobados"];

  const nestedResponses = await Promise.all(
    trainingDocs.docs.map(async (trainingDoc) => {
      const trainingId = trainingDoc.id;
      const bucketSnapshots = await Promise.all(
        bucketNames.map((bucket) => db.collection("respuestasCapacitaciones").doc(trainingId).collection(bucket).get()),
      );

      return bucketSnapshots.flatMap((snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        .filter((response) => {
          const responseUserIds = uniqueValues([
            response?.userId,
            response?.usuarioDocId,
            response?.uid,
            response?.uidUsuario,
            response?.usuarioId,
          ]);
          const responseNominas = uniqueValues([
            response?.nominaUsuario,
            response?.nomina,
            response?.nominaEmpleado,
          ]).map((value) => String(value).trim());

          const matchesUser = responseUserIds.some((value) => userIds.includes(String(value).trim()));
          const matchesNomina = responseNominas.some((value) => nominas.includes(String(value).trim()));
          return matchesUser || matchesNomina;
        });
    }),
  );

  return dedupeById(nestedResponses.flat());
};

const buildEmptyRecordsState = () => ({
  reconocimientos: [],
  incidencias: [],
  incapacidades: [],
  historialesMedicos: [],
  capacitaciones: [],
});

const getUserByEmployee = async (employee = {}) => {
  const candidates = [
    employee?.docId,
    employee?.id,
    employee?.uid,
    employee?.uidFirebase,
    employee?.firebaseUid,
    employee?.userUid,
    employee?.userId,
  ]
    .map((value) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : ""))
    .filter(Boolean);

  if (!candidates.length) return null;

  for (const candidate of candidates) {
    const byDoc = await usersCollection.doc(candidate).get();
    if (byDoc.exists) {
      return { id: byDoc.id, ...byDoc.data() };
    }
  }

  for (const candidate of candidates) {
    const byUid = await usersCollection.where("uid", "==", candidate).limit(1).get();
    if (!byUid.empty) {
      const doc = byUid.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }

  const nomina = employee?.nomina ? String(employee.nomina).trim() : "";
  if (nomina) {
    const byNomina = await usersCollection.where("nomina", "==", nomina).limit(1).get();
    if (!byNomina.empty) {
      const doc = byNomina.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }

  return null;
};

const createPersonalNotification = async ({ userId, title, message, destino, accion, extra = {} }) => {
  if (!userId) return null;

  const notificationRef = await db.collection("notificaciones").add({
    IdUsuario: userId,
    Titulo: title,
    Mensaje: message,
    Destino: destino || null,
    Accion: accion || null,
    enviado: false,
    fechaCreacion: new Date(),
    fechaEnviado: null,
    ...extra,
  });

  return { id: notificationRef.id };
};

const mapMedicalHistoryRecords = (docs = []) => docs
  .filter((record) => {
    const estado = String(record?.estado ?? "").trim().toLowerCase();
    return ["cerrada", "en tratamiento", "pendiente"].includes(estado);
  })
  .map((record) => ({
    id: record.id,
    ...record,
    type: "historialMedico",
    fecha: record.fechaCierre || record.fechaApertura,
  }));

const getPersonalRecordsByUsers = async (usuarios = []) => {
  const validUsers = (usuarios || []).filter((usuario) => usuario && (usuario.id || usuario.uid || usuario.nomina));
  if (!validUsers.length) return buildEmptyRecordsState();

  const userIds = uniqueValues(
    validUsers.flatMap((usuario) => [usuario.uid, usuario.id, usuario.uidFirebase, usuario.userId]),
  );

  const nominas = uniqueValues(
    validUsers
      .map((usuario) => usuario.nomina)
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => String(value).trim()),
  );

  const [reconocimientos, incidencias, incapacidades, ordenesMedicas, legacyResponses, nestedResponses, capacitacionesMeta] = await Promise.all([
    Promise.all([
      queryCollectionByFieldIn(reconocimientosCollection, "empleadoId", userIds),
      queryCollectionByFieldIn(reconocimientosCollection, "empleadoNomina", nominas),
      queryCollectionByFieldIn(reconocimientosCollection, "userId", userIds),
    ]).then((sections) => dedupeById(sections.flat())),
    Promise.all([
      queryCollectionByFieldIn(incidenciasCollection, "empleadoId", userIds),
      queryCollectionByFieldIn(incidenciasCollection, "empleadoNomina", nominas),
      queryCollectionByFieldIn(incidenciasCollection, "userId", userIds),
    ]).then((sections) => dedupeById(sections.flat())),
    Promise.all([
      queryCollectionByFieldIn(incapacidadesCollection, "userId", userIds),
      queryCollectionByFieldIn(incapacidadesCollection, "nomina", nominas),
    ]).then((sections) => dedupeById(sections.flat())),
    Promise.all([
      queryCollectionByFieldIn(ordenesMedicasCollection, "idPaciente", userIds),
      queryCollectionByFieldIn(ordenesMedicasCollection, "nominaPaciente", nominas),
      queryCollectionByFieldIn(ordenesMedicasCollection, "userId", userIds),
    ]).then((sections) => dedupeById(sections.flat())),
    Promise.all([
      queryCollectionByFieldIn(respuestasCapacitacionesCollection, "userId", userIds),
      queryCollectionByFieldIn(respuestasCapacitacionesCollection, "nominaUsuario", nominas),
    ]).then((sections) => dedupeById(sections.flat())),
    queryNestedTrainingResponsesByUsers(userIds, nominas),
    capacitacionesCollection.get(),
  ]);

  const respuestasCapacitacion = dedupeById([...(legacyResponses || []), ...(nestedResponses || [])]);

  const capacitacionesMetaMap = new Map(
    capacitacionesMeta.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]),
  );

  const capacitaciones = (respuestasCapacitacion || []).map((respuesta) => {
    const metadata = capacitacionesMetaMap.get(respuesta.capacitacionId);
    return {
      ...respuesta,
      descripcion: metadata?.descripcion || respuesta.descripcion || "",
      fecha: respuesta.fechaEnviado || respuesta.fechaRespuesta || respuesta.createdAt,
      titulo: respuesta.titulo || metadata?.titulo || metadata?.nombre || "",
    };
  });

  return {
    reconocimientos: reconocimientos || [],
    incidencias: incidencias || [],
    incapacidades: incapacidades || [],
    historialesMedicos: mapMedicalHistoryRecords(ordenesMedicas || []),
    capacitaciones: capacitaciones || [],
  };
};

// CREACIÓN DE RECONOCIMIENTOS, INCIDENCIAS, INCAPACIDADES

exports.createPersonalReconocimiento = onCall(async (request) => {
  requireAuth(request);

  const data = request.data || {};
  const empleado = data.empleado || data.usuario || {};
  const titulo = String(data.titulo || "").trim();
  const descripcion = String(data.descripcion || "").trim();
  const tipo = String(data.tipo || "destacado").trim() || "destacado";

  if (!titulo || !descripcion) {
    throw new HttpsError("invalid-argument", "Título y descripción son requeridos.");
  }

  const empleadoRecord = await getUserByEmployee(empleado);
  if (!empleadoRecord) {
    throw new HttpsError("not-found", "No se encontró al empleado para registrar el reconocimiento.");
  }

  const currentUser = await getProfileByAuth(request);
  const empleadoUid = String(empleadoRecord.uid || empleadoRecord.id || "").trim();
  const emitidoPor = currentUser?.nombre || "Sistema";
  const emitidoPorUid = currentUser?.uid || request.auth?.uid || null;
  const emitidoPorNomina = currentUser?.nomina || "";

  const anioActual = new Date().getFullYear();
  const reconocimientoId = db.collection("reconocimientos").doc().id;
  const reconocimientoRef = db.collection("reconocimientos").doc(reconocimientoId);
  const userYearRef = usersCollection
    .doc(empleadoRecord.id)
    .collection(String(anioActual))
    .doc("informacion")
    .collection("Reconocimientos")
    .doc(reconocimientoId);

  const payload = {
    id: reconocimientoId,
    usuarioDocId: empleadoRecord.id,
    usuarioUid: empleadoUid,
    empleadoId: empleadoRecord.id,
    empleadoNombre: empleadoRecord.nombre || "Trabajador",
    empleadoNomina: String(empleadoRecord.nomina || ""),
    empleadoArea: empleadoRecord.area || "",
    emitidoPor: emitidoPor,
    emitidoPorUid: emitidoPorUid,
    emitidoPorNomina: emitidoPorNomina,
    titulo,
    descripcion,
    tipo: data.isPrimeraVez === true ? "primer_logro" : tipo,
    estado: "activo",
    anio: anioActual,
    fecha: new Date().toISOString(),
    createdAt: new Date(),
  };

  const batch = db.batch();
  batch.set(reconocimientoRef, payload);
  batch.set(userYearRef, { ...payload, createdAt: new Date() });
  await batch.commit();

  if (empleadoUid) {
    await createPersonalNotification({
      userId: empleadoUid,
      title: "🏆 Reconocimiento recibido",
      message: `${emitidoPor} te otorgó el reconocimiento "${titulo}".`,
      destino: "reconocimientos",
      accion: "reconocimiento",
      extra: {
        empleadoId: empleadoRecord.id,
        tipo: payload.tipo,
        titulo,
      },
    });
  }

  return payload;
});

exports.createPersonalIncidencia = onCall(async (request) => {
  requireAuth(request);

  const data = request.data || {};
  const empleado = data.empleado || data.usuario || {};
  const titulo = String(data.titulo || "").trim();
  const descripcion = String(data.descripcion || "").trim();
  const tipo = String(data.tipo || "incidencia").trim() || "incidencia";
  const prioridad = String(data.prioridad || "media").trim() || "media";

  if (!titulo || !descripcion) {
    throw new HttpsError("invalid-argument", "Título y descripción son requeridos.");
  }

  const empleadoRecord = await getUserByEmployee(empleado);
  if (!empleadoRecord) {
    throw new HttpsError("not-found", "No se encontró al empleado para registrar la incidencia.");
  }

  const currentUser = await getProfileByAuth(request);
  const destinoUid = String(empleadoRecord.uid || empleadoRecord.id || "").trim();
  const incidenciaId = db.collection("incidencias_personal").doc().id;
  const incidenciaRef = db.collection("incidencias_personal").doc(incidenciaId);
  const anioActual = new Date().getFullYear();
  const userYearRef = usersCollection
    .doc(empleadoRecord.id)
    .collection(String(anioActual))
    .doc("informacion")
    .collection("Incidencias")
    .doc(incidenciaId);

  const payload = {
    id: incidenciaId,
    usuarioDocId: empleadoRecord.id,
    empleadoId: empleadoRecord.id,
    empleadoNombre: empleadoRecord.nombre || "Trabajador",
    empleadoNomina: String(empleadoRecord.nomina || ""),
    empleadoArea: empleadoRecord.area || "",
    reportadoPor: currentUser?.nombre || "Sistema",
    reportadoPorUid: currentUser?.uid || request.auth?.uid || null,
    reportadoPorNomina: currentUser?.nomina || "",
    titulo,
    descripcion,
    tipo,
    prioridad,
    estado: "pendiente",
    fecha: new Date().toISOString(),
    createdAt: new Date(),
  };

  const batch = db.batch();
  batch.set(incidenciaRef, payload);
  batch.set(userYearRef, { ...payload, createdAt: new Date() });
  await batch.commit();

  if (destinoUid) {
    await createPersonalNotification({
      userId: destinoUid,
      title: "⚠️ Incidencia registrada",
      message: `${currentUser?.nombre || "Tu líder"} registró una incidencia para ti: "${titulo}".`,
      destino: "incidencias",
      accion: "incidencia",
      extra: {
        incidenciaId,
        empleadoId: empleadoRecord.id,
        prioridad,
      },
    });
  }

  return payload;
});

exports.createPersonalIncapacidad = onCall(async (request) => {
  requireAuth(request);

  const data = request.data || {};
  const empleado = data.empleado || data.usuario || {};
  const empleadoRecord = await getUserByEmployee(empleado);
  if (!empleadoRecord) {
    throw new HttpsError("not-found", "No se encontró al empleado para registrar la incapacidad.");
  }

  const tipo = String(data.tipo || "incapacidad").trim() || "incapacidad";
  const fechaInicio = data.fechaInicio || null;
  const fechaFin = data.fechaFin || null;
  const nota = String(data.nota || "").trim();

  const incapacidadId = incapacidadesCollection.doc().id;
  const incapacidadRef = incapacidadesCollection.doc(incapacidadId);
  const anioActual = new Date().getFullYear();
  const userYearRef = usersCollection
    .doc(empleadoRecord.id)
    .collection(String(anioActual))
    .doc("informacion")
    .collection("Incapacidades")
    .doc(incapacidadId);

  const payload = {
    id: incapacidadId,
    userId: empleadoRecord.id,
    nomina: empleadoRecord.nomina ? Number(empleadoRecord.nomina) : null,
    nombre: empleadoRecord.nombre || "",
    genero: empleadoRecord.genero || "",
    area: empleadoRecord.area || "",
    empleadoArea: empleadoRecord.area || "",
    tipo,
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    fecha: new Date().toISOString(),
    nota,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const batch = db.batch();
  batch.set(incapacidadRef, payload);
  batch.set(userYearRef, { ...payload, id: userYearRef.id, createdAt: new Date() });
  batch.update(usersCollection.doc(empleadoRecord.id), {
    estado: "incapacidad",
    activo: true,
    tipoIncapacidad: tipo,
    fechaInicioIncapacidad: fechaInicio || null,
    fechaFinIncapacidad: fechaFin || null,
    notaIncapacidad: nota,
    updatedAt: new Date(),
  });
  await batch.commit();

  if (empleadoRecord.uid) {
    await createPersonalNotification({
      userId: empleadoRecord.uid,
      title: "🏥 Incapacidad registrada",
      message: `Se registró una incapacidad para ${empleadoRecord.nombre || "el empleado"}.`,
      destino: "incapacidades",
      accion: "incapacidad",
      extra: {
        incapacidadId,
        empleadoId: empleadoRecord.id,
        tipo,
      },
    });
  }

  return payload;
});

// GETS PARA LA TABLA DE PERSONAL

const getPersonalUsersInternal = async (request) => {
  const currentUser = await getProfileByAuth(request);
  if (!currentUser) {
    throw new HttpsError("unauthenticated", "No se encontró el usuario autenticado.");
  }

  const snapshot = await usersCollection.get();
  const allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return getAllowedUsersForPersonal(allUsers, currentUser);
};

exports.getPersonalUsers = onCall(async (request) => getPersonalUsersInternal(request));

exports.getPersonalPageData = onCall(async (request) => {
  requireAuth(request);

  const users = await getPersonalUsersInternal(request);
  const records = await getPersonalRecordsByUsers(users);

  return {
    users,
    records,
  };
});

exports.getPersonalRecordsByUsers = onCall(async (request) => {
  requireAuth(request);

  const data = request.data || {};
  const rawUsers = Array.isArray(data.users) ? data.users : [];
  const rawUserIds = Array.isArray(data.userIds) ? data.userIds : [];

  let users = rawUsers;

  if (!users.length && rawUserIds.length) {
    const snapshots = await Promise.all(
      rawUserIds.map((userId) => usersCollection.doc(String(userId)).get()),
    );
    users = snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  }

  return getPersonalRecordsByUsers(users);
});

exports.getPersonalUserDetails = onCall(async (request) => {
  requireAuth(request);

  const { userId } = request.data || {};
  if (!userId) {
    throw new HttpsError("invalid-argument", "Se requiere un userId válido.");
  }

  const snapshot = await usersCollection.doc(String(userId)).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "No se encontró el usuario solicitado.");
  }

  return { id: snapshot.id, ...snapshot.data() };
});

exports.getPersonalIncidencias = onCall(async (request) => {
  requireAuth(request);
  const users = await getPersonalUsersInternal(request);
  const records = await getPersonalRecordsByUsers(users);
  return records.incidencias;
});

exports.getPersonalReconocimientos = onCall(async (request) => {
  requireAuth(request);
  const users = await getPersonalUsersInternal(request);
  const records = await getPersonalRecordsByUsers(users);
  return records.reconocimientos;
});

exports.getPersonalIncapacidades = onCall(async (request) => {
  requireAuth(request);
  const users = await getPersonalUsersInternal(request);
  const records = await getPersonalRecordsByUsers(users);
  return records.incapacidades;
});

exports.getPersonalHistorialesMedicos = onCall(async (request) => {
  requireAuth(request);
  const users = await getPersonalUsersInternal(request);
  const records = await getPersonalRecordsByUsers(users);
  return records.historialesMedicos;
});

exports.getPersonalCapacitaciones = onCall(async (request) => {
  requireAuth(request);
  const users = await getPersonalUsersInternal(request);
  const records = await getPersonalRecordsByUsers(users);
  return records.capacitaciones;
});

// PDF MODAL

const resolveRecordType = (record) => {
  if (!record) return "general";
  if (record.type === "reconocimiento") return "reconocimiento";
  if (record.type === "incidencia") return "incidencia";
  if (record.type === "incapacidad") return "incapacidad";
  if (record.type === "capacitacion") return "capacitacion";
  if (record.type === "historialMedico" || Boolean(record.nombrePaciente) || Boolean(record.nominaPaciente) || Boolean(record.areaPaciente) || Boolean(record.idPaciente) || Boolean(record.fechaCierre) || Boolean(record.fechaApertura)) {
    return "historialMedico";
  }
  return "general";
};

const parseRecordDate = (record) => {
  const value = record?.fecha || record?.createdAt || record?.fechaInicio || record?.fechaCierre || record?.fechaApertura || record?.fechaCurso || record?.fechaRespuesta;
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value?.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const matchesDateRange = (record, fechaInicio, fechaFin) => {
  if (!fechaInicio && !fechaFin) return true;

  const recordDate = parseRecordDate(record);
  if (!recordDate) return false;

  const startDate = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
  const endDate = fechaFin ? new Date(`${fechaFin}T23:59:59.999`) : null;

  if (resolveRecordType(record) === "incapacidad" && record?.fechaFin) {
    const recordEnd = new Date(`${record.fechaFin}T23:59:59.999`);
    if (!Number.isNaN(recordEnd.getTime())) {
      if (startDate && recordEnd < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      return true;
    }
  }

  if (startDate && recordDate < startDate) return false;
  if (endDate && recordDate > endDate) return false;
  return true;
};

const matchesUserForReport = (record, usuario) => {
  const empleadoId = String(usuario?.id || usuario?.uid || "").trim();
  const recordEmpleadoId = String(record?.empleadoId || record?.empleadoUid || record?.userId || record?.idPaciente || "").trim();
  const recordNomina = String(record?.empleadoNomina || record?.nomina || record?.nominaPaciente || record?.nominaUsuario || "").trim();
  const userNomina = String(usuario?.nomina || "").trim();
  const recordNombre = String(record?.empleadoNombre || record?.nombre || record?.nombrePaciente || "").trim().toLowerCase();
  const userNombre = String(usuario?.nombre || "").trim().toLowerCase();

  if (empleadoId && recordEmpleadoId && recordEmpleadoId.toLowerCase() === empleadoId.toLowerCase()) {
    return true;
  }

  if (userNomina && recordNomina && recordNomina.toLowerCase() === userNomina.toLowerCase()) {
    return true;
  }

  if (userNombre && recordNombre && recordNombre === userNombre) {
    return true;
  }

  return false;
};

exports.getPersonalPdfReportData = onCall(async (request) => {
  requireAuth(request);

  const data = request.data || {};
  const tipoReporte = String(data.tipoReporte || "general").trim();
  const nomina = String(data.nomina || "").trim();
  const categoria = String(data.categoria || "general").trim();
  const fechaInicio = String(data.fechaInicio || "").trim();
  const fechaFin = String(data.fechaFin || "").trim();

  const allUsers = await getPersonalUsersInternal(request);
  const targetUsers = tipoReporte === "nomina"
    ? allUsers.filter((usuario) => {
        const text = nomina.toLowerCase();
        if (!text) return false;
        const haystack = `${usuario?.nomina || ""} ${usuario?.nombre || ""}`.toLowerCase();
        return haystack.includes(text);
      })
    : allUsers;

  const recordsState = await getPersonalRecordsByUsers(targetUsers);

  const rawRecords = [
    ...((recordsState.reconocimientos || []).map((record) => ({ ...record, type: "reconocimiento" }))),
    ...((recordsState.incidencias || []).map((record) => ({ ...record, type: "incidencia" }))),
    ...((recordsState.incapacidades || []).map((record) => ({ ...record, type: "incapacidad" }))),
    ...((recordsState.historialesMedicos || []).map((record) => ({ ...record, type: "historialMedico" }))),
    ...((recordsState.capacitaciones || []).map((record) => ({ ...record, type: "capacitacion" }))),
  ];

  const filteredRecords = rawRecords
    .filter((record) => targetUsers.some((usuario) => matchesUserForReport(record, usuario)))
    .filter((record) => matchesDateRange(record, fechaInicio, fechaFin))
    .filter((record) => {
      const type = resolveRecordType(record);
      if (categoria === "general") return true;
      if (categoria === "incidencias") return type === "incidencia";
      if (categoria === "reconocimientos") return type === "reconocimiento";
      if (categoria === "incapacidades") return type === "incapacidad";
      if (categoria === "capacitacion") return type === "capacitacion";
      if (categoria === "historialMedico") return type === "historialMedico";
      return true;
    })
    .sort((a, b) => {
      const aTime = parseRecordDate(a)?.getTime?.() || 0;
      const bTime = parseRecordDate(b)?.getTime?.() || 0;
      return bTime - aTime;
    });

  return {
    users: targetUsers,
    records: filteredRecords,
  };
});
