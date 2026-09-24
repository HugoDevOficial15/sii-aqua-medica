const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const getSurveyCollection = () => db.collection("encuestas");

const getOperatorProfile = async (request) => {
    const authUid = request?.auth?.uid;
    if (!authUid) return null;

    const requestedUserId = request?.data?.userId;
    if (requestedUserId) {
        const requestedSnapshot = await db.collection("users").doc(String(requestedUserId)).get();
        if (requestedSnapshot.exists) {
            const requestedProfile = { id: requestedSnapshot.id, ...requestedSnapshot.data(), firebaseUid: authUid };
            if (String(requestedProfile.rol || requestedProfile.role || "").toLowerCase() === "operador") {
                return requestedProfile;
            }
        }
    }

    const byUid = await db.collection("users").where("uid", "==", authUid).limit(1).get();
    if (!byUid.empty) {
        return { id: byUid.docs[0].id, ...byUid.docs[0].data(), firebaseUid: authUid };
    }

    const authEmail = request?.auth?.token?.email;
    if (authEmail) {
        const byEmail = await db.collection("users").where("email", "==", authEmail).limit(1).get();
        if (!byEmail.empty) {
            return { id: byEmail.docs[0].id, ...byEmail.docs[0].data(), firebaseUid: authUid };
        }
    }

    const byId = await db.collection("users").doc(authUid).get();
    return byId.exists ? { id: byId.id, ...byId.data(), firebaseUid: authUid } : null;
};

const normalizeAssignment = (assignment = {}) => {
    const tipo = assignment?.tipo || "global";
    const valores = Array.isArray(assignment?.valores)
        ? assignment.valores.map((value) => String(value).trim()).filter(Boolean)
        : [];

    return tipo === "area" || tipo === "usuarios" ? { tipo, valores } : { tipo: "global", valores: [] };
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

const createSurveyNotifications = async (survey, surveyId, previousAssignment = null) => {
    const currentUsers = await getUsersForAssignment(survey.asignacion);
    let usersToNotify = currentUsers;

    if (previousAssignment) {
        const previousUsers = new Set(await getUsersForAssignment(previousAssignment));
        usersToNotify = currentUsers.filter((uid) => !previousUsers.has(uid));
    }

    console.log("[surveys] Encuesta", surveyId, "asignación", normalizeAssignment(survey.asignacion), "destinatarios", usersToNotify.length);
    if (!usersToNotify.length) return 0;

    for (let index = 0; index < usersToNotify.length; index += 500) {
        const batch = db.batch();
        usersToNotify.slice(index, index + 500).forEach((uid) => {
            const notificationRef = db.collection("notificaciones").doc();
            batch.set(notificationRef, {
                IdUsuario: uid,
                Titulo: "📋 Nueva Encuesta",
                Mensaje: `Se ha asignado una nueva encuesta: ${survey.titulo}`,
                Destino: "surveys",
                Accion: "nueva_encuesta",
                extra: { encuestaId: surveyId, encuestaTitulo: survey.titulo },
                enviado: false,
                fechaCreacion: FieldValue.serverTimestamp(),
                fechaEnviado: null,
            });
        });
        await batch.commit();
    }

    return usersToNotify.length;
};

const getSurveyResponsesByUser = async (surveyId, userId) => {
    const surveyRef = db.collection("respuestasEncuestas").doc(String(surveyId));
    const buckets = ["pendientes", "aprobados", "reprobados"];
    const snapshots = await Promise.all(
        buckets.map((bucket) => surveyRef.collection(bucket).where("userId", "==", userId).get())
    );

    return snapshots.flatMap((snapshot) => snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
    })));
};

const normalizeResponseCollectionName = (value, fallback = "respuestasEncuestas") => {
    const candidate = String(value ?? fallback).trim();
    if (candidate === "respuestasEncuestas" || candidate === "respuestasCapacitaciones") {
        return candidate;
    }
    return fallback;
};

const getSurveyResponses = async (surveyId, collectionName = "respuestasEncuestas") => {
    const safeCollection = normalizeResponseCollectionName(collectionName, "respuestasEncuestas");
    const surveyRef = db.collection(safeCollection).doc(String(surveyId));
    const buckets = ["pendientes", "aprobados", "reprobados"];
    const snapshots = await Promise.all(
        buckets.map((bucket) => surveyRef.collection(bucket).get())
    );

    return snapshots.flatMap((snapshot) => snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
    })));
};

const getSurveyResponsesFromRequest = async (request) => {
    const data = request?.data || {};
    const surveyId = String(data.surveyId || data.id || data.trainingId || data.capacitacionId || "").trim();
    const collectionName = normalizeResponseCollectionName(data.collectionName, "respuestasEncuestas");

    if (!surveyId) {
        throw new HttpsError("invalid-argument", "Falta el id de la encuesta o capacitación.");
    }

    return { surveyId, collectionName };
};

//  OPERADOR

const surveyMatchesOperator = (survey, operator) => {
    const assignment = normalizeAssignment(survey.asignacion);
    if (assignment.tipo === "global") return true;

    const values = new Set(assignment.valores.map((value) => String(value).trim()));
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

exports.getOperatorSurveys = onCall(async (request) => {
    const operator = await getOperatorProfile(request);
    if (!operator) {
        throw new HttpsError("unauthenticated", "No se encontró el perfil del operador.");
    }

    const surveysSnapshot = await getSurveyCollection().get();
    const surveys = surveysSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((survey) => survey.activa !== false && surveyMatchesOperator(survey, operator));

    const responses = [];
    await Promise.all(surveys.map(async (survey) => {
        const buckets = await Promise.all(["pendientes", "aprobados", "reprobados"].map((bucket) =>
            db.collection("respuestasEncuestas").doc(survey.id).collection(bucket)
                .where("userId", "==", operator.id).get()
        ));
        buckets.forEach((bucketSnapshot) => bucketSnapshot.docs.forEach((docSnap) => {
            responses.push({ id: docSnap.id, ...docSnap.data() });
        }));
    }));

    return { surveys, responses, operatorId: operator.id };
});

exports.getSurveyDetail = onCall(async (request) => {
    const surveyId = String(request?.data?.surveyId || request?.data?.id || "").trim();
    if (!surveyId) {
        throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");
    }

    const surveyDoc = await getSurveyCollection().doc(surveyId).get();
    if (!surveyDoc.exists) {
        throw new HttpsError("not-found", "Encuesta no encontrada.");
    }

    return {
        ok: true,
        survey: { id: surveyDoc.id, ...surveyDoc.data() },
    };
});

exports.getSurveyAttempts = onCall(async (request) => {
    const surveyId = String(request?.data?.surveyId || request?.data?.id || "").trim();
    const userId = request?.data?.userId || request?.auth?.uid;

    if (!surveyId) {
        throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");
    }

    if (!userId) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar intentos.");
    }

    const responses = await getSurveyResponsesByUser(surveyId, userId);
    return {
        ok: true,
        attempts: responses.length,
        responses,
    };
});

exports.getMySurveyResponses = onCall(async (request) => {
    const authUserId = request?.auth?.uid;
    const requestedUserId = request?.data?.userId || authUserId;

    if (!requestedUserId) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar tus respuestas.");
    }

    const surveysSnapshot = await getSurveyCollection().get();
    const surveyIds = surveysSnapshot.docs.map((docSnap) => docSnap.id);

    const responses = await Promise.all(
        surveyIds.map(async (surveyId) => getSurveyResponsesByUser(surveyId, requestedUserId))
    );

    return {
        ok: true,
        responses: responses.flat(),
    };
});

exports.getSurveyResponsesForAdmin = onCall(async (request) => {
    const { surveyId, collectionName } = await getSurveyResponsesFromRequest(request);

    return {
        ok: true,
        responses: await getSurveyResponses(surveyId, collectionName),
    };
});

exports.reviewSurveyResponse = onCall(async (request) => {
    const data = request?.data || {};
    const collectionName = normalizeResponseCollectionName(data.collectionName, "respuestasEncuestas");
    const surveyId = String(data.surveyId || data.encuestaId || data.capacitacionId || data.id || "").trim();
    const responseId = String(data.responseId || data.idRespuesta || data.response?.id || "").trim();
    const response = data.response || {};
    const finalBucket = data.finalBucket || "aprobados";
    const finalState = data.finalState || "aprobado";

    if (!surveyId || !responseId) {
        throw new HttpsError("invalid-argument", "Falta el id del registro o la respuesta.");
    }

    const pendingRef = db.collection(collectionName).doc(String(surveyId)).collection("pendientes").doc(responseId);
    const finalRef = db.collection(collectionName).doc(String(surveyId)).collection(finalBucket).doc(responseId);
    const pendingSnapshot = await pendingRef.get();

    if (!pendingSnapshot.exists) {
        throw new HttpsError("not-found", "La respuesta no se encontró en pendientes.");
    }

    const finalPayload = {
        ...(pendingSnapshot.data() || {}),
        ...response,
        id: responseId,
        estadoActual: finalState,
        estado: finalState,
        aprobada: finalState === "aprobado" || finalState === "completada",
        tieneRespuestasAbiertas: false,
        revisadoPorAdmin: true,
        fechaRevision: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(finalRef, finalPayload, { merge: true });
    batch.delete(pendingRef);
    await batch.commit();

    return { ok: true, id: responseId, bucket: finalBucket, estado: finalState };
});

exports.hasAnsweredSurvey = onCall(async (request) => {
    const surveyId = String(request?.data?.surveyId || request?.data?.id || "").trim();
    const userId = request?.data?.userId || request?.auth?.uid;

    if (!surveyId) {
        throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");
    }
    if (!userId) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar si respondiste.");
    }

    const responses = await getSurveyResponsesByUser(surveyId, userId);
    return {
        ok: true,
        answered: responses.length > 0,
        responses,
    };
});

exports.getSurveyHistory = onCall(async (request) => {
    const userId = request?.data?.userId || request?.auth?.uid;
    if (!userId) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar tu historial.");
    }

    const surveysSnapshot = await getSurveyCollection().get();
    const surveyIds = surveysSnapshot.docs.map((docSnap) => docSnap.id);

    const responses = await Promise.all(
        surveyIds.map(async (surveyId) => getSurveyResponsesByUser(surveyId, userId))
    );

    return {
        ok: true,
        history: responses.flat(),
    };
});

exports.getSurveyMetrics = onCall(async (request) => {
    const userId = request?.data?.userId || request?.auth?.uid;
    if (!userId) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar tus métricas.");
    }

    const historyResult = await exports.getSurveyHistory({ auth: request.auth, data: { userId } });
    const history = historyResult.history || [];

    return {
        ok: true,
        respondidas: history.length,
        reprobadas: history.filter((item) => Number(item?.calificacion ?? item?.puntuacionObtenida ?? 0) < 80).length,
    };
});

exports.saveOperatorSurveyResponse = onCall(async (request) => {
    const operator = await getOperatorProfile(request);
    const data = request?.data || {};
    const surveyId = data.encuestaId || data.idEncuesta || data.surveyId;

    if (!operator) throw new HttpsError("unauthenticated", "No se encontró el perfil del operador.");
    if (!surveyId) throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");

    const surveySnapshot = await getSurveyCollection().doc(String(surveyId)).get();
    if (!surveySnapshot.exists) throw new HttpsError("not-found", "Encuesta no encontrada.");

    const survey = { id: surveySnapshot.id, ...surveySnapshot.data() };
    if (!surveyMatchesOperator(survey, operator)) {
        throw new HttpsError("permission-denied", "La encuesta no está asignada al operador.");
    }

    const pending = Boolean(data.estadoActual === "pendiente_validacion" || data.tieneRespuestasAbiertas);
    const approved = !pending && Number(data.calificacion ?? data.puntuacionObtenida ?? 0) >= 80;
    const bucket = pending ? "pendientes" : (approved ? "aprobados" : "reprobados");
    const estado = pending ? "pendiente_validacion" : (approved ? "aprobado" : "reprobado");
    const responseRef = db.collection("respuestasEncuestas").doc(String(surveyId)).collection(bucket).doc();
    const responseData = {
        ...data,
        encuestaId: String(surveyId),
        idEncuesta: String(surveyId),
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
        .collection("Resultados").doc("Encuestas").collection("items").doc();
    batch.set(yearRef, { ...responseData, id: yearRef.id });
    await batch.commit();

    if (survey.userId) {
        const creatorSnapshot = await db.collection("users").where("uid", "==", survey.userId).limit(1).get();
        const creatorId = creatorSnapshot.empty ? String(survey.userId) : creatorSnapshot.docs[0].id;
        const notificationRef = db.collection("notificaciones").doc();
        await notificationRef.set({
            IdUsuario: creatorId,
            Titulo: "📋 Encuesta respondida",
            Mensaje: `${responseData.nombre || "Un operador"} respondió la encuesta: ${survey.titulo || "Encuesta"}`,
            Destino: "surveys",
            Accion: "encuesta_respondida",
            extra: { encuestaId: String(surveyId), usuarioId: operator.id, calificacion: responseData.calificacion ?? null },
            enviado: false,
            fechaCreacion: FieldValue.serverTimestamp(),
            fechaEnviado: null,
        });
    }

    return { ok: true, id: responseRef.id, estado, aprobada: approved };
});

// CREAR,ELIMINAR,VER Y MODIFICAR ENCUESTAS

exports.getSurveys = onCall(async (request) => {
    const uid = request?.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar encuestas.");
    }

    const snapshot = await getSurveyCollection()
        .where("userId", "==", uid)
        .get();

    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
    }));
});

exports.createSurvey = onCall(async (request) => {
    const uid = request?.auth?.uid;
    const payload = request?.data || {};

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear encuestas.");
    }

    const surveyData = {
        ...payload,
        userId: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await getSurveyCollection().add(surveyData);
    const notificationsCreated = await createSurveyNotifications(surveyData, ref.id);
    return { ok: true, id: ref.id, notificationsCreated };
});

exports.updateSurvey = onCall(async (request) => {
    const uid = request?.auth?.uid;
    const { id, ...data } = request?.data || {};

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para actualizar encuestas.");
    }

    if (!id) {
        throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");
    }

    const surveyRef = getSurveyCollection().doc(id);
    const currentSnapshot = await surveyRef.get();

    if (!currentSnapshot.exists || currentSnapshot.data().userId !== uid) {
        throw new HttpsError("not-found", "Encuesta no encontrada.");
    }

    const previousSurvey = currentSnapshot.data();
    await surveyRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    });

    const previousAssignment = normalizeAssignment(previousSurvey.asignacion);
    const nextAssignment = normalizeAssignment(data.asignacion);
    if (JSON.stringify(previousAssignment) !== JSON.stringify(nextAssignment)) {
        await createSurveyNotifications({ ...previousSurvey, ...data, asignacion: nextAssignment }, id, previousAssignment);
    }

    return { ok: true, id };
});

exports.deleteSurvey = onCall(async (request) => {
    const uid = request?.auth?.uid;
    const id = request?.data?.id;

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para eliminar encuestas.");
    }

    if (!id) {
        throw new HttpsError("invalid-argument", "Falta el id de la encuesta.");
    }

    const surveyRef = getSurveyCollection().doc(id);
    const surveySnapshot = await surveyRef.get();

    if (!surveySnapshot.exists || surveySnapshot.data().userId !== uid) {
        throw new HttpsError("not-found", "Encuesta no encontrada.");
    }

    const [responsesSnapshot, notificationsSnapshot] = await Promise.all([
        db.collection("respuestasEncuestas").where("encuestaId", "==", id).get(),
        db.collection("notificaciones").where("extra.encuestaId", "==", id).get(),
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

    await surveyRef.delete();
    return { ok: true, id };
}); 