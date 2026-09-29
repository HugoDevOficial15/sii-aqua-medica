const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const notasCollection = db.collection("notas");

const getNoteId = (payload = {}) => payload.docId || payload.id || null;

// CREAR

exports.createNota = onCall(async (request) => {
    const payload = request?.data || {};
    const userId = payload.userId || request?.auth?.uid;

    if (!userId) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear una nota.");
    }

    const { id: ignoredId, docId: ignoredDocId, ...noteData } = payload;
    const ahora = new Date();
    const nuevaNota = {
        ...noteData,
        userId,
        createdAt: ahora,
        updatedAt: ahora,
    };

    const resultado = await notasCollection.add(nuevaNota);
    return { id: resultado.id, ...nuevaNota };
});

// OBTENER

exports.obtenerNotasPorUsuario = onCall(async (request) => {
    const userId = request?.data?.userId || request?.auth?.uid;

    if (!userId) {
        throw new HttpsError("invalid-argument", "El ID de usuario es requerido.");
    }

    const snapshot = await notasCollection.where("userId", "==", userId).get();
    const notas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return notas;
});

// UPDATE

exports.updateNota = onCall(async (request) => {
    const payload = request?.data || {};
    const noteId = getNoteId(payload);

    if (!noteId) {
        throw new HttpsError("invalid-argument", "El ID de la nota es requerido.");
    }

    const { id: ignoredId, docId: ignoredDocId, ...updates } = payload;
    const ref = notasCollection.doc(noteId);

    await ref.update({
        ...updates,
        updatedAt: new Date(),
    });

    const snapshot = await ref.get();
    return { id: snapshot.id, ...snapshot.data() };
});

// DELETE

exports.deleteNota = onCall(async (request) => {
    const payload = request?.data || {};
    const noteId = getNoteId(payload);

    if (!noteId) {
        throw new HttpsError("invalid-argument", "El ID de la nota es requerido.");
    }

    await notasCollection.doc(noteId).delete();
    return { id: noteId };
});