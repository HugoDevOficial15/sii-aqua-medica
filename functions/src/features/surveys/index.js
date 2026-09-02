const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { db } = require("../../config/firebase");

const getSurveyCollection = () => db.collection("encuestas");

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await getSurveyCollection().add(surveyData);
    return { ok: true, id: ref.id };
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

    await getSurveyCollection().doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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

    await getSurveyCollection().doc(id).delete();
    return { ok: true, id };
}); 