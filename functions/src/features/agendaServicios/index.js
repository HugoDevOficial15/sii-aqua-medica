const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const { FieldValue } = require("firebase-admin/firestore");

const serviciosCollections = db.collection("servicios_programados");
const diasBloqueadosCollection = db.collection("dias_bloqueados");
const bloqueosHorariosCollection = db.collection("bloqueosHorarios");

const getRequestData = (request) => request?.data ?? {};

const timeToMinutes = (time) => {
    if (!time || typeof time !== "string") return null;

    const [hora, minutos] = time.split(":").map(Number);

    if (Number.isNaN(hora) || Number.isNaN(minutos)) {
        return null;
    }

    return (hora * 60) + minutos;
};

const hayOverlap = (inicioA, finA, inicioB, finB) => {
    return inicioA < finB && finA > inicioB;
};

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
    const {
        fecha,
        horaInicio,
        horaFin,
        duracionMin,
        areaId,
    } = payload;

    if (!fecha || !horaInicio || !horaFin) {
        throw new HttpsError(
            "invalid-argument",
            "Faltan datos para crear el servicio: fecha, horaInicio y horaFin son requeridos."
        );
    }

    const inicioMinutos = timeToMinutes(horaInicio);
    const finMinutos = timeToMinutes(horaFin);

    if (inicioMinutos === null || finMinutos === null) {
        throw new HttpsError(
            "invalid-argument",
            "La hora de inicio y la hora de fin deben tener formato HH:mm."
        );
    }

    if (finMinutos <= inicioMinutos) {
        throw new HttpsError(
            "invalid-argument",
            "La hora fin debe ser mayor a la hora de inicio."
        );
    }

    const duracionSolicitada = Number(duracionMin);

    if (Number.isFinite(duracionSolicitada) && duracionSolicitada > 0) {
        const diferencia = finMinutos - inicioMinutos;

        if (Math.abs(diferencia - duracionSolicitada) > 5) {
            throw new HttpsError(
                "invalid-argument",
                "La duración del servicio no coincide con el rango horario indicado."
            );
        }
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);

    if (!anio || !mes || !dia || String(fecha).length !== 10) {
        throw new HttpsError(
            "invalid-argument",
            "La fecha del servicio es inválida."
        );
    }

    const snapshotServicios = await serviciosCollections
        .where("fecha", "==", fecha)
        .get();

    const conflictoServicio = snapshotServicios.docs.some((doc) => {
        const data = doc.data();
        if (!data?.horaInicio || !data?.horaFin) return false;

        const inicioExistente = timeToMinutes(data.horaInicio);
        const finExistente = timeToMinutes(data.horaFin);

        if (inicioExistente === null || finExistente === null) return false;

        return hayOverlap(
            inicioMinutos,
            finMinutos,
            inicioExistente,
            finExistente
        );
    });

    if (conflictoServicio) {
        throw new HttpsError(
            "already-exists",
            "Ya existe otro servicio agendado en esa fecha y horario."
        );
    }

    const snapshotBloqueos = await bloqueosHorariosCollection
        .where("fecha", "==", fecha)
        .get();

    const conflictoBloqueo = snapshotBloqueos.docs.some((doc) => {
        const data = doc.data();
        if (!data?.horaInicio || !data?.horaFin) return false;

        const inicioBloqueado = timeToMinutes(data.horaInicio);
        const finBloqueado = timeToMinutes(data.horaFin);

        if (inicioBloqueado === null || finBloqueado === null) return false;

        return hayOverlap(
            inicioMinutos,
            finMinutos,
            inicioBloqueado,
            finBloqueado
        );
    });

    if (conflictoBloqueo) {
        throw new HttpsError(
            "failed-precondition",
            "El horario solicitado está bloqueado por una restricción de disponibilidad."
        );
    }

    const servicio = {
        ...payload,
        areaId: areaId ? String(areaId).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : areaId,
        estado: "pendiente",
        createdAt: new Date(),
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

// ======================================================
// CORREGIR EMAILS DE USUARIOS
// Cambia @aquamediaca.com por @aquamedica.com
// ======================================================

exports.corregirEmailsAquaMedica = onCall(async (request) => {
    const { dryRun = true } = getRequestData(request);

    try {
        const usersCollection = db.collection("users");

        const snapshot = await usersCollection.get();

        const encontrados = [];
        const corregidos = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();

            const emailActual = String(data.email || "").trim();

            // Solo procesa correos que tengan exactamente
            // el dominio incorrecto.
            if (!/@aquamediaca\.com$/i.test(emailActual)) {
                continue;
            }

            const emailNuevo = emailActual.replace(
                /@aquamediaca\.com$/i,
                "@aquamedica.com"
            );

            const usuario = {
                id: doc.id,
                nomina: data.nomina ?? null,
                nombre: data.nombre ?? null,
                emailAnterior: emailActual,
                emailNuevo,
            };

            encontrados.push(usuario);

            // Si dryRun es true, NO modifica Firestore.
            if (dryRun) {
                continue;
            }

            await doc.ref.update({
                email: emailNuevo,
                updatedAt: FieldValue.serverTimestamp(),
            });

            corregidos.push(usuario);
        }

        return {
            success: true,
            dryRun,
            encontrados: encontrados.length,
            corregidos: corregidos.length,
            data: dryRun ? encontrados : corregidos,
        };

    } catch (error) {
        console.error("Error al corregir emails:", error);

        throw new HttpsError(
            "internal",
            "Ocurrió un error al corregir los emails.",
            error.message
        );
    }
});