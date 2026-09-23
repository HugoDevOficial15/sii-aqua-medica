const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const ideasCollection = db.collection("Ideas");

const normalizeIdeaPayload = (request) => {
    const payload = request?.data || {};
    const user = payload.user || {};

    return {
        idUsuario: user?.id || user?.uid || null,
        uid: user?.id || user?.uid || null,
        solicitante: user?.nombre || "ANÓNIMO",
        nomina: user?.nomina || "N/A",
        rol: user?.rol || "",
        area: user?.area || "",
        correo: user?.email || "",
        tipoRemitente: "usuario",
        titulo: String(payload.titulo || "").trim(),
        categoria: payload.categoria || "General",
        descripcion: String(payload.descripcion || "").trim(),
        pantalla: payload.pantalla || "Ideas",
        imagen: typeof payload.imagenBase64 === "string" ? payload.imagenBase64 : "",
        pdf: typeof payload.pdfBase64 === "string" ? payload.pdfBase64 : "",
        estado: "Pendiente",
        comentarioAdmin: "",
        fecha: new Date().toLocaleDateString("es-MX"),
        fechaCreacion: FieldValue.serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null,
    };
};

// CREAR UNA IDEA { OPERADOR }
exports.createIdea = onCall(async (request) => {
    const payload = request?.data || {};

    if (!payload.titulo || !String(payload.titulo).trim()) {
        throw new HttpsError("invalid-argument", "El título es obligatorio.");
    }

    if (!payload.descripcion || !String(payload.descripcion).trim()) {
        throw new HttpsError("invalid-argument", "La descripción es obligatoria.");
    }

    const ideaData = normalizeIdeaPayload(request);
    const docRef = await ideasCollection.add(ideaData);

    return { success: true, id: docRef.id };
});

// OBTENER TODAS LAS IDEAS { ADMIN }
exports.cargarIdeas = onCall(async () => {
    const snapshot = await ideasCollection.orderBy("fechaCreacion", "desc").get();
    const ideas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    return { success: true, ideas };
});

// OBTENER TODAS LAS IDEAS POR OPERADOR { OPERADOR }
exports.getIdeasByUser = onCall(async (request) => {
    const rawId = request?.data?.id ?? request?.data?.nomina ?? request?.data?.uid;
    const id = String(rawId || "").trim();

    if (!id) {
        return { success: true, ideas: [] };
    }

    const snapshot = await ideasCollection.get();
    const ideas = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((idea) => {
            const candidates = [
                idea?.uid,
                idea?.idUsuario,
                idea?.nomina,
                idea?.correo,
            ];

            return candidates.some((value) => {
                if (value === undefined || value === null || value === "") {
                    return false;
                }
                return String(value).trim() === id;
            });
        })
        .sort((a, b) => {
            const aTime = a.fechaCreacion?.seconds ?? 0;
            const bTime = b.fechaCreacion?.seconds ?? 0;
            return bTime - aTime;
        });

    return { success: true, ideas };
});

// CAMBIAR ESTADO DE IDEAS ( ADMINISTRADOR )
exports.cambiarEstadoIdea = onCall(async (request) => {
    const { id, nuevoEstado, comentarioAdmin = "", administradorRevision } = request?.data || {};

    if (!id || !String(id).trim()) {
        throw new HttpsError("invalid-argument", "El ID de la idea es obligatorio");
    }

    if (!nuevoEstado || !String(nuevoEstado).trim()) {
        throw new HttpsError("invalid-argument", "El nuevo estado de la idea es obligatorio");
    }

    const docRef = ideasCollection.doc(String(id).trim());
    await docRef.update({
        estado: String(nuevoEstado).trim(),
        comentarioAdmin: String(comentarioAdmin || "").trim(),
        fechaRevision: FieldValue.serverTimestamp(),
        administradorRevision: administradorRevision || request?.auth?.token?.name || request?.auth?.uid || "Administrador",
    });

    return { success: true };
});

exports.deleteIdea = onCall(async (request) => {
    const { id } = request?.data || {};

    if (!id || !String(id).trim()) {
        throw new HttpsError("invalid-argument", "El ID de la idea es obligatorio.");
    }

    await ideasCollection.doc(String(id).trim()).delete();
    return { success: true };
});
