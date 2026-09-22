const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const serviciosCollections = db.collection("servicios_programados");
const diasBloqueadosCollection = db.collection("dias_bloqueados");
const bloqueosHorariosCollection = db.collection("bloqueosHorarios");

const getRequestData = (request) => request?.data ?? {};

exports.getServicios = onCall(async (request) => {
    const { areaId, anio, mes } = getRequestData(request);

    if (!areaId || !anio || !mes) {
        throw new HttpsError("invalid-argument", "Faltan datos para consultar servicios.");
    }

    const areaID = String(areaId).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const snapshot = await serviciosCollections
        .where("areaId", "==", areaID)
        .where("anio", "==", Number(anio))
        .where("mes", "==", Number(mes))
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.getServiciosGlobal = onCall(async (request) => {
    const { anio, mes } = getRequestData(request);

    if (!anio || !mes) {
        throw new HttpsError("invalid-argument", "Faltan datos para consultar servicios globales.");
    }

    const snapshot = await serviciosCollections
        .where("anio", "==", Number(anio))
        .where("mes", "==", Number(mes))
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.crearServicio = onCall(async (request) => {
    const payload = getRequestData(request);
    const servicio = {
        ...payload,
        estado: "pendiente",
        createdAt: new Date()
    };

    const docRef = await serviciosCollections.add(servicio);
    return { id: docRef.id, ...servicio };
});

exports.actualizarServicio = onCall(async (request) => {
    const { id, ...payload } = getRequestData(request);

    if (!id) {
        throw new HttpsError("invalid-argument", "El ID del servicio es requerido.");
    }

    const ref = serviciosCollections.doc(id);
    await ref.update(payload);
    const updatedDoc = await ref.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
});

exports.getDiasBloqueados = onCall(async (request) => {
    const { anio, mes } = getRequestData(request);

    const snapshot = await diasBloqueadosCollection
        .where("anio", "==", Number(anio))
        .where("mes", "==", Number(mes))
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.bloquearDia = onCall(async (request) => {
    const { fecha, motivo } = getRequestData(request);

    if (!fecha) {
        throw new HttpsError("invalid-argument", "La fecha es requerida.");
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    const payload = {
        fecha,
        motivo: motivo || "",
        anio: fechaObj.getFullYear(),
        mes: fechaObj.getMonth() + 1,
        createdAt: new Date()
    };

    const docRef = await diasBloqueadosCollection.add(payload);
    return { id: docRef.id, ...payload };
});

exports.eliminarDiaBloqueado = onCall(async (request) => {
    const { id } = getRequestData(request);
    if (!id) {
        throw new HttpsError("invalid-argument", "El ID del día bloqueado es requerido.");
    }
    const ref = diasBloqueadosCollection.doc(id);
    await ref.delete();
    return { id };
});

exports.bloquearHorario = onCall(async (request) => {
    const { fecha, motivo, horaInicio, horaFin } = getRequestData(request);

    if (!fecha || !horaInicio || !horaFin) {
        throw new HttpsError("invalid-argument", "Faltan datos para bloquear el horario.");
    }

    const docRef = await bloqueosHorariosCollection.add({
        fecha,
        motivo: motivo || "",
        horaInicio,
        horaFin,
        createdAt: new Date()
    });

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
});

exports.getBloqueosHorarios = onCall(async (request) => {
    const { anio, mes } = getRequestData(request);

    const snapshot = await bloqueosHorariosCollection
        .where("fecha", ">=", `${Number(anio)}-${String(Number(mes)).padStart(2, "0")}-01`)
        .where("fecha", "<=", `${Number(anio)}-${String(Number(mes)).padStart(2, "0")}-31`)
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

exports.eliminarBloqueosHorario = onCall(async (request) => {
    const { id } = getRequestData(request);
    if (!id) {
        throw new HttpsError("invalid-argument", "El ID del bloqueo horario es requerido.");
    }
    const ref = bloqueosHorariosCollection.doc(id);
    await ref.delete();
    return { id };
});