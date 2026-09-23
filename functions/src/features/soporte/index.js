const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../../config/firebase");

const reportesCollection = db.collection("Problemas reportados");

// CREAR TICKETS { OPERADOR }

exports.createSupportTicket = onCall(async (request) => {
    const { user = {}, tipoRemitente, asunto, descripcion, pantalla, capturas } = request?.data || {};

    if (!asunto || !String(asunto).trim()) {
        throw new HttpsError("invalid-argument", "El asunto es obligatorio.");
    }

    if (!descripcion || !String(descripcion).trim()) {
        throw new HttpsError("invalid-argument", "La descripción es obligatoria.");
    }

    const imageBase64 = typeof capturas === "string" ? capturas : "";

    const docRef = await reportesCollection.add({
        idUsuario: user?.uid || user?.id || null,
        uid: user?.uid || user?.id || null,
        solicitante: user?.nombre || "ANÓNIMO",
        nomina: user?.nomina || "N/A",
        rol: user?.rol || "",
        area: user?.area || "",
        correo: user?.email || "",
        tipoRemitente: tipoRemitente || "usuario",
        asunto: String(asunto).trim(),
        pantalla: pantalla || "",
        descripcion: String(descripcion).trim(),
        capturas: imageBase64,
        estado: "Pendiente",
        comentarioAdmin: "",
        fecha: new Date().toLocaleDateString("es-MX"),
        fechaCreacion: FieldValue.serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null,
    });

    return { success: true, id: docRef.id };
});

// CARGAR REPORTES { ADMINISTRADOR } 

exports.cargarProblemas = onCall(async () => {
    const snapshot = await reportesCollection.orderBy("fechaCreacion", "desc").get();
    const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    return { success: true, lista };
});

// CAMBIAR ESTADO DE UN REPORTE { ADMINISTRADOR }

exports.cambiarEstado = onCall(async (request) => {
    const { id, nuevoEstado, comentarioAdmin = "" } = request?.data || {};

    if (!id || !String(id).trim()) {
        throw new HttpsError("invalid-argument", "El ID del reporte es obligatorio.");
    }

    if (!nuevoEstado || !String(nuevoEstado).trim()) {
        throw new HttpsError("invalid-argument", "El nuevo estado es obligatorio.");
    }

    const docRef = reportesCollection.doc(String(id).trim());
    await docRef.update({
        estado: String(nuevoEstado).trim(),
        comentarioAdmin: String(comentarioAdmin || "").trim(),
        fechaRevision: FieldValue.serverTimestamp(),
        administradorRevision: request?.auth?.token?.name || request?.auth?.uid || "Administrador",
    });

    return { success: true };
});

// ELIMINAR REPORTE { ADMINISTRADOR }

exports.handleEliminarProblema = onCall(async (request) => {
    const { id } = request?.data || {};

    if (!id || !String(id).trim()) {
        throw new HttpsError("invalid-argument", "El ID del reporte es obligatorio.");
    }

    const docRef = reportesCollection.doc(String(id).trim());
    await docRef.delete();

    return { success: true };
});

