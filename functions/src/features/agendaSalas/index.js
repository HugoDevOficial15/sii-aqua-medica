const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const agendaSalasCollection = db.collection("agendaSalas");

const getRequestData = (request) => request?.data ?? {};

const toMinutes = (hora) => {
  if (!hora) return 0;
  const [hours, minutes] = String(hora).split(":").map(Number);
  return hours * 60 + minutes;
};

const haySolapamiento = (inicioA, finA, inicioB, finB) => {
  return inicioA < finB && finA > inicioB;
};

const normalizarReserva = (doc) => {
  const data = doc.data() ?? {};
  const asistentes = Number(data.asistentes ?? data.asistente ?? 0);
  const nominaResponsable = String(
    data.nominaResponsable ??
    data.nomina ??
    data.responsable ??
    data.responsableNomina ??
    data?.responsable?.nomina ??
    data?.responsable?.numero ??
    ""
  ).trim();

  return {
    id: doc.id,
    ...data,
    nominaResponsable,
    asistentes,
    asistente: asistentes,
  };
};

exports.getAgendaSalas = onCall(async () => {
  const snapshot = await agendaSalasCollection.orderBy("fecha", "asc").get();
  return snapshot.docs.map(normalizarReserva);
});

exports.getAgendaSalasPorMes = onCall(async (request) => {
  const { anio, mes } = getRequestData(request);

  if (!anio || !mes) {
    throw new HttpsError(
      "invalid-argument",
      "Se requieren el año y el mes para consultar la agenda."
    );
  }

  const snapshot = await agendaSalasCollection
    .where("anio", "==", Number(anio))
    .where("mes", "==", Number(mes))
    .orderBy("fecha", "asc")
    .get();

  return snapshot.docs.map(normalizarReserva);
});

exports.crearAgendaSala = onCall(async (request) => {
  const payload = getRequestData(request);
  const titulo = String(payload.titulo ?? "").trim();
  const tipo = String(payload.tipo ?? "Conferencia").trim();
  const sala = String(payload.sala ?? "").trim();
  const fecha = String(payload.fecha ?? "").trim();
  const horaInicio = String(payload.horaInicio ?? "").trim();
  const horaFin = String(payload.horaFin ?? "").trim();
  const nominaResponsable = String(
    payload.nominaResponsable ??
    payload.nomina ??
    payload.responsable ??
    payload.responsableNomina ??
    payload?.responsable?.nomina ??
    payload?.responsable?.numero ??
    ""
  ).trim();
  const descripcion = String(payload.descripcion ?? "").trim();
  const asistentes = Number(payload.asistentes ?? payload.asistente ?? 0);

  if (!titulo) {
    throw new HttpsError("invalid-argument", "Debe escribir un título para el evento.");
  }

  if (!fecha) {
    throw new HttpsError("invalid-argument", "Debe seleccionar una fecha.");
  }

  if (!horaInicio || !horaFin) {
    throw new HttpsError("invalid-argument", "Debe indicar la hora de inicio y fin.");
  }

  if (!nominaResponsable) {
    throw new HttpsError("invalid-argument", "Ingrese la nómina del responsable.");
  }

  const inicio = toMinutes(horaInicio);
  const fin = toMinutes(horaFin);

  if (fin <= inicio) {
    throw new HttpsError("invalid-argument", "La hora final debe ser mayor a la hora de inicio.");
  }

  if (inicio < 8 * 60 || fin > 23 * 60 + 59) {
    throw new HttpsError(
      "invalid-argument",
      "Los eventos solo pueden agendarse entre las 08:00 y las 23:59."
    );
  }

  const fechaObj = new Date(`${fecha}T12:00:00`);
  const anio = fechaObj.getFullYear();
  const mes = fechaObj.getMonth() + 1;

  if (Number.isNaN(fechaObj.getTime())) {
    throw new HttpsError("invalid-argument", "La fecha seleccionada no es válida.");
  }

  const reservasDelDia = await agendaSalasCollection
    .where("fecha", "==", fecha)
    .where("sala", "==", sala)
    .get();

  const conflicto = reservasDelDia.docs.some((doc) => {
    const reserva = doc.data();
    const reservaInicio = toMinutes(reserva.horaInicio);
    const reservaFin = toMinutes(reserva.horaFin);
    return haySolapamiento(inicio, fin, reservaInicio, reservaFin);
  });

  if (conflicto) {
    throw new HttpsError(
      "already-exists",
      "Ese horario ya está ocupado en la sala seleccionada. Elige otro rango."
    );
  }

  const asistentesFinales = Number.isFinite(asistentes) ? asistentes : 0;

  const nuevaReserva = {
    titulo,
    tipo,
    sala,
    fecha,
    horaInicio,
    horaFin,
    nominaResponsable,
    asistentes: asistentesFinales,
    asistente: asistentesFinales,
    descripcion,
    anio,
    mes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await agendaSalasCollection.add(nuevaReserva);
  return {
    id: docRef.id,
    ...nuevaReserva,
  };
});

exports.editarAgendaSala = onCall(async (request) => {
  const { id, ...payload } = getRequestData(request);
  const reservaId = String(id ?? "").trim();

  if (!reservaId) {
    throw new HttpsError("invalid-argument", "El ID de la reserva es requerido.");
  }

  const reservaActual = await agendaSalasCollection.doc(reservaId).get();

  if (!reservaActual.exists) {
    throw new HttpsError("not-found", "La reserva que intentas editar no existe.");
  }

  const titulo = String(payload.titulo ?? reservaActual.data().titulo ?? "").trim();
  const tipo = String(payload.tipo ?? reservaActual.data().tipo ?? "Conferencia").trim();
  const sala = String(payload.sala ?? reservaActual.data().sala ?? "").trim();
  const fecha = String(payload.fecha ?? reservaActual.data().fecha ?? "").trim();
  const horaInicio = String(payload.horaInicio ?? reservaActual.data().horaInicio ?? "").trim();
  const horaFin = String(payload.horaFin ?? reservaActual.data().horaFin ?? "").trim();
  const nominaResponsable = String(
    payload.nominaResponsable ??
    payload.nomina ??
    payload.responsable ??
    payload.responsableNomina ??
    payload?.responsable?.nomina ??
    payload?.responsable?.numero ??
    reservaActual.data().nominaResponsable ??
    reservaActual.data().nomina ??
    reservaActual.data().responsable ??
    reservaActual.data().responsableNomina ??
    reservaActual.data()?.responsable?.nomina ??
    reservaActual.data()?.responsable?.numero ??
    ""
  ).trim();
  const descripcion = String(payload.descripcion ?? reservaActual.data().descripcion ?? "").trim();
  const asistentes = Number(payload.asistentes ?? payload.asistente ?? reservaActual.data().asistentes ?? reservaActual.data().asistente ?? 0);

  if (!titulo) {
    throw new HttpsError("invalid-argument", "Debe escribir un título para el evento.");
  }

  if (!fecha) {
    throw new HttpsError("invalid-argument", "Debe seleccionar una fecha.");
  }

  if (!horaInicio || !horaFin) {
    throw new HttpsError("invalid-argument", "Debe indicar la hora de inicio y fin.");
  }

  if (!nominaResponsable) {
    throw new HttpsError("invalid-argument", "Ingrese la nómina del responsable.");
  }

  const inicio = toMinutes(horaInicio);
  const fin = toMinutes(horaFin);

  if (fin <= inicio) {
    throw new HttpsError("invalid-argument", "La hora final debe ser mayor a la hora de inicio.");
  }

  if (inicio < 8 * 60 || fin > 23 * 60 + 59) {
    throw new HttpsError(
      "invalid-argument",
      "Los eventos solo pueden agendarse entre las 08:00 y las 23:59."
    );
  }

  const fechaObj = new Date(`${fecha}T12:00:00`);
  const anio = fechaObj.getFullYear();
  const mes = fechaObj.getMonth() + 1;

  if (Number.isNaN(fechaObj.getTime())) {
    throw new HttpsError("invalid-argument", "La fecha seleccionada no es válida.");
  }

  const reservasDelDia = await agendaSalasCollection
    .where("fecha", "==", fecha)
    .where("sala", "==", sala)
    .get();

  const conflicto = reservasDelDia.docs.some((doc) => {
    if (doc.id === reservaId) return false;
    const reserva = doc.data();
    const reservaInicio = toMinutes(reserva.horaInicio);
    const reservaFin = toMinutes(reserva.horaFin);
    return haySolapamiento(inicio, fin, reservaInicio, reservaFin);
  });

  if (conflicto) {
    throw new HttpsError(
      "already-exists",
      "Ese horario ya está ocupado en la sala seleccionada. Elige otro rango."
    );
  }

  const datosActualizados = {
    titulo,
    tipo,
    sala,
    fecha,
    horaInicio,
    horaFin,
    nominaResponsable,
    asistentes: Number.isFinite(asistentes) ? asistentes : 0,
    asistente: Number.isFinite(asistentes) ? asistentes : 0,
    descripcion,
    anio,
    mes,
    updatedAt: new Date(),
  };

  await agendaSalasCollection.doc(reservaId).update(datosActualizados);

  return {
    id: reservaId,
    ...datosActualizados,
  };
});

exports.eliminarAgendaSala = onCall(async (request) => {
  const { id } = getRequestData(request);

  if (!id) {
    throw new HttpsError("invalid-argument", "El ID de la reserva es requerido.");
  }

  await agendaSalasCollection.doc(id).delete();
  return { id, deleted: true };
});
