const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const getCapacitacionCollection = () => db.collection("capacitaciones");

const isOperatorProfile = (profile) =>
    String(profile?.rol || profile?.Rol || profile?.role || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes("operador");

const getOperatorProfile = async (request) =>{
    const authUid = request?.auth?.uid;
    if(!authUid) return null;

    const requestedUserId = request?.data?.userId;
    if (requestedUserId) {
        const requestedSnapshot = await db.collection("users").doc(String(requestedUserId)).get();
        if (requestedSnapshot.exists) {
            const requestedProfile = { id: requestedSnapshot.id, ...requestedSnapshot.data(), firebaseUid: authUid };
            const tokenEmail = String(request?.token?.email || "").trim().toLowerCase();
            const loginIdentifier = tokenEmail.split("@")[0];
            const requestedNomina = String(request?.data?.nomina || "").trim();
            const matchesSession = [requestedProfile.email, requestedProfile.username]
                .map((value) => String(value ?? "").trim().toLowerCase())
                .some((value) => value && (value === tokenEmail || value === loginIdentifier))
                || [requestedProfile.nomina, requestedProfile.nominaUsuario, requestedProfile.numeroNomina]
                    .map((value) => String(value ?? "").trim())
                    .some((value) => value && (value === loginIdentifier || value === requestedNomina));

            if ((requestedProfile.uid === authUid || matchesSession) && isOperatorProfile(requestedProfile)) {
                return requestedProfile;
            }
        }
    }
    
    const byUid = await db.collection("users").where("uid", "==", authUid).limit(1).get();
    if (!byUid.empty) {
        const profile = { id: byUid.docs[0].id, ...byUid.docs[0].data(), firebaseUid: authUid };
        return isOperatorProfile(profile) ? profile : null;
    }

    const authEmail = request?.token?.email;
    if (authEmail) {
        const usersRef = db.collection("users");
        const loginIdentifier = String(authEmail).split("@")[0].trim();
        const [byEmail, byNomina] = await Promise.all([
            usersRef.where("email", "==", authEmail).limit(1).get(),
            loginIdentifier
                ? usersRef.where("nomina", "==", loginIdentifier).limit(1).get()
                : Promise.resolve({ empty: true, docs: [] }),
        ]);

        if (!byEmail.empty) {
            const profile = { id: byEmail.docs[0].id, ...byEmail.docs[0].data(), firebaseUid: authUid };
            return isOperatorProfile(profile) ? profile : null;
        }

        if (!byNomina.empty) {
            const profile = { id: byNomina.docs[0].id, ...byNomina.docs[0].data(), firebaseUid: authUid };
            return isOperatorProfile(profile) ? profile : null;
        }

        const fallbackSnapshot = await usersRef.get();
        const normalizedEmail = String(authEmail).trim().toLowerCase();
        const fallbackDoc = fallbackSnapshot.docs.find((docSnap) => {
            const data = docSnap.data();
            return [data.email, data.username, data.nomina, data.nominaUsuario, data.numeroNomina]
                .some((value) => String(value ?? "").trim().toLowerCase() === normalizedEmail
                    || String(value ?? "").trim() === loginIdentifier);
        });

        if (fallbackDoc) {
            const profile = { id: fallbackDoc.id, ...fallbackDoc.data(), firebaseUid: authUid };
            return isOperatorProfile(profile) ? profile : null;
        }
    }

    const byId = await db.collection("users").doc(authUid).get();
    const profile = byId.exists ? { id: byId.id, ...byId.data(), firebaseUid: authUid } : null;
    return isOperatorProfile(profile) ? profile : null;
};

const normalizeAssignment = (assignment = {} ) => {
    const tipo = assignment?.tipo || "global";
    const valores = Array.isArray(assignment?.valores)
        ? assignment.valores.map((value) => String(value).trim()).filter(Boolean) 
        : [];
    
    return tipo === "area" || tipo === "usuarios" ? {tipo, valores } : { tipo: "global", valores: [] };   
};

const normalizeIdentifier = (value) => {
    const normalizedValue = String(value ?? "").trim().toLowerCase();
    if (!normalizedValue) return "";

    const numericValue = Number(normalizedValue);
    return Number.isNaN(numericValue) ? normalizedValue : String(numericValue);
};

const getUsersForAssignment = async (assignment) => {
    const normalized = normalizeAssignment(assignment);
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();
    const assignedValues = new Set(normalized.valores.map(normalizeValue));
    const assignedIdentifiers = new Set(normalized.valores.map(normalizeIdentifier));
    const isOperator = (user) => String(user.rol || user.Rol || user.role || "").trim().toLowerCase() === "operador";
        const userIdentifiers = (user) => [
            user.nomina,
            user.nominaUsuario,
            user.numeroNomina,
            user.uid,
            user.userId,
            user.id,
        ].map(normalizeIdentifier).filter(Boolean);
    const matchesAssignment = (user) => {
            if (normalized.tipo === "usuarios") {
                return userIdentifiers(user).some((identifier) => assignedIdentifiers.has(identifier));
        }

        if (!isOperator(user)) return false;
        if (normalized.tipo === "global") return true;
        if (normalized.tipo === "area") {
            const userArea = normalizeValue(user.area ?? user.Area ?? user.empleadoArea ?? user.EmpleadoArea);
            return assignedValues.has(userArea);
        }

        return false;
    };

    return [...new Map(
        users
            .filter(matchesAssignment)
            .filter((user) => user.id || user.uid || user.userId)
            .map((user) => {
                const recipientId = String(user.id || user.uid || user.userId);
                return [recipientId, recipientId];
            })
    ).values()];
};

const createTrainingNotifications = async (training, trainingId, previousAssignment = null) => {
    const currentUsers = await getUsersForAssignment(training.asignacion);
    let usersToNotify = currentUsers;

    if (previousAssignment) {
        const previousUsers = new Set(await getUsersForAssignment(previousAssignment));
        usersToNotify = currentUsers.filter((uid) => !previousUsers.has(uid));
    }

    console.log("[capacitaciones] Capacitación", trainingId, "asignación", normalizeAssignment(training.asignacion), "destinatarios", usersToNotify.length);
    if (!usersToNotify.length) return 0;

    for (let index = 0; index < usersToNotify.length; index += 500) {
        const batch = db.batch();
        usersToNotify.slice(index, index + 500).forEach((uid) => {
            const notificationRef = db.collection("notificaciones").doc();
            batch.set(notificationRef, {
                IdUsuario: uid,
                Titulo: "📚 Nueva Capacitación",
                Mensaje: `Se ha asignado una nueva capacitación: ${training.titulo}`,
                Destino: "training",
                Accion: "nueva_capacitacion",
                extra: { capacitacionId: trainingId, capacitacionTitulo: training.titulo },
                enviado: false,
                fechaCreacion: FieldValue.serverTimestamp(),
                fechaEnviado: null,
            });
        });
        await batch.commit();
    }

    return usersToNotify.length;
};

//  OPERADOR

const trainingMatchesOperator = (training, operator) => {
    const assignment = normalizeAssignment(training.asignacion);
    if (assignment.tipo === "global") return true;

    const values = new Set(assignment.valores.map(normalizeIdentifier));
        if (assignment.tipo === "area") { 
            const operatorArea = String(operator.area || operator.Area || operator.empleadoArea || operator.EmpleadoArea || "")
                .trim()
                .toLowerCase();
            return new Set(assignment.valores.map((value) => String(value).trim().toLowerCase())).has(operatorArea);
    }

        return [
            operator.nomina,
            operator.nominaUsuario,
            operator.numeroNomina,
            operator.uid,
            operator.userId,
            operator.id,
            operator.firebaseUid,
        ].map(normalizeIdentifier).some((identifier) => values.has(identifier));
};

// OBTENER LAS CAPACITACIONES DE LOS OPERADORES Y SUS RESPUESTAS

exports.getOperatorTrainings = onCall(async (request) => {
    const operator = await getOperatorProfile(request);
    if (!operator) {
        throw new HttpsError("unauthenticated", "No se encontró el perfil del operador.");
    }

    const trainingsSnapshot = await getCapacitacionCollection().get();
    const trainings = trainingsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((training) => training.activa !== false && trainingMatchesOperator(training, operator));

    const responses = [];
    await Promise.all(trainings.map(async (training) => {
        const buckets = await Promise.all(["pendientes", "aprobados", "reprobados"].map((bucket) =>
            db.collection("respuestasCapacitaciones").doc(training.id).collection(bucket)
                .where("userId", "==", operator.id).get()
        ));
        buckets.forEach((bucketSnapshot) => bucketSnapshot.docs.forEach((docSnap) => {
            responses.push({ id: docSnap.id, ...docSnap.data() });
        }));
    }));

    return { trainings, responses, operatorId: operator.id };
});

exports.saveOperatorTrainingResponse = onCall(async (request) => {
    const operator = await getOperatorProfile(request);
    const data = request?.data || {};
    const trainingId = data.capacitacionId || data.idCapacitacion || data.trainingId;

    if (!operator) throw new HttpsError("unauthenticated", "No se encontró el perfil del operador.");
    if (!trainingId) throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");

    const trainingSnapshot = await getCapacitacionCollection().doc(String(trainingId)).get();
    if (!trainingSnapshot.exists) throw new HttpsError("not-found", "Encuesta no encontrada.");

    const training = { id: trainingSnapshot.id, ...trainingSnapshot.data() };
    if (!trainingMatchesOperator(training, operator)) {
        throw new HttpsError("permission-denied", "La encuesta no está asignada al operador.");
    }

    const pending = Boolean(data.estadoActual === "pendiente_validacion" || data.tieneRespuestasAbiertas);
    const approved = !pending && Number(data.calificacion ?? data.puntuacionObtenida ?? 0) >= 80;
    const bucket = pending ? "pendientes" : (approved ? "aprobados" : "reprobados");
    const estado = pending ? "pendiente_validacion" : (approved ? "aprobado" : "reprobado");
    const responseRef = db.collection("respuestasCapacitaciones").doc(String(trainingId)).collection(bucket).doc();
    const responseData = {
        ...data,
        capacitacionId: String(trainingId),
        idCapacitacion: String(trainingId),
        userId: operator.id,
        usuarioDocId: operator.id,
        nominaUsuario: operator.nomina ?? data.nominaUsuario ?? null,
        username: operator.username ?? data.username ?? "",
        nombre: operator.nombre ?? data.nombre ?? "",
        area: operator.area ?? operator.Area ?? data.area ?? "",
        id: responseRef.id,
        estado,
        aprobada: approved,
        createdAt: FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    batch.set(responseRef, responseData);

    const yearRef = db.collection("users").doc(operator.id)
        .collection(String(new Date().getFullYear())).doc("informacion")
        .collection("Resultados").doc("Capacitaciones").collection("items").doc();
    batch.set(yearRef, { ...responseData, id: yearRef.id });
    await batch.commit();

    if (training.userId) {
        const creatorSnapshot = await db.collection("users").where("uid", "==", training.userId).limit(1).get();
        const creatorId = creatorSnapshot.empty ? String(training.userId) : creatorSnapshot.docs[0].id;
        const notificationRef = db.collection("notificaciones").doc();
        await notificationRef.set({
            IdUsuario: creatorId,
            Titulo: "📋 Capacitacion respondida",
            Mensaje: `${responseData.nombre || "Un operador"} respondió la encuesta: ${training.titulo || "Capacitacion"}`,
            Destino: "trainings",
            Accion: "capacitacion_respondida",
            extra: { trainingId: String(trainingId), usuarioId: operator.id, calificacion: responseData.calificacion ?? null },
            enviado: false,
            fechaCreacion: FieldValue.serverTimestamp(),
            fechaEnviado: null,
        });
    }

    return { ok: true, id: responseRef.id, estado, aprobada: approved };
});



// CREAR,ELIMINAR,VER Y MODIFICAR CAPACITACIONES

exports.getTraining = onCall(async (request) => {
    const uid = request?.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar capacitaciones.");
    }

    const snapshot = await getCapacitacionCollection()
    .where("userId", "==", uid)
    .get();

    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
    }));
});

exports.createTraining = onCall (async (request) => {

    const uid = request?.auth?.uid;
    const payload = request?.data || {};

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear capacitaciones.");
    }

    const trainingData = {
        ...payload,
        userId: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await getCapacitacionCollection().add(trainingData);
    const notificationsCreated = await createTrainingNotifications(trainingData, ref.id);
    return { ok: true, id: ref.id, notificationsCreated };
});

exports.updateTraining = onCall(async (request) => {
    const uid = request?.auth?.uid;
    const { id, ...data } = request?.data || {};

    if(!uid){
        throw new HttpsError("invalid-argument", "Falta el id de la capacitación.");
    }

    if (!id) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para actualizar capacitaciones.");
    }

    const trainingRef = getCapacitacionCollection().doc(id);
    const currentSnapshot = await trainingRef.get();

    if (!currentSnapshot.exists || currentSnapshot.data().userId !== uid) {
        throw new HttpsError("not-found", "Encuesta no encontrada.");
    }

    const previousTraining = currentSnapshot.data();
    await trainingRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    });

    const previousAssignment = normalizeAssignment(previousTraining.asignacion);
    const nextAssignment = normalizeAssignment(data.asignacion ?? previousTraining.asignacion);
    if (JSON.stringify(previousAssignment) !== JSON.stringify(nextAssignment)) {
        await createTrainingNotifications({ ...previousTraining, ...data, asignacion: nextAssignment }, id, previousAssignment);
    }

    return { ok: true, id};
});

exports.deleteTraining = onCall(async (request) => {
    const uid = request?.auth?.uid;
    const id = request?.data?.id;

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para eliminar capacitaciones.");
    }

    if (!id) {
        throw new HttpsError("invalid-argument", "Falta el id de la capacitación.");
    }

    const trainingRef = getCapacitacionCollection().doc(id);
    const trainingSnapshot = await trainingRef.get();

    if (!trainingSnapshot.exists || trainingSnapshot.data().userId !== uid) {
        throw new HttpsError("not-found", "Capacitación no encontrada.");
    }

    const [responsesSnapshot, notificationsSnapshot] = await Promise.all([
        db.collection("respuestasCapacitaciones").where("idCapacitacion", "==", id).get(),
        db.collection("notificaciones").where("extra.idCapacitacion", "==", id).get(),
    ]);

    const documentsToDelete = [
        ...responsesSnapshot.docs,
        ...notificationsSnapshot.docs,
    ];

    for (let index = 0; index < documentsToDelete.length; index += 500) {
        const batch = db.batch();
        documentsToDelete.slice(index, index + 500).forEach((document) => batch.delete(document.ref));
        await batch.commit();
    }

    await trainingRef.delete();
    return { ok: true, id };
}); 