import { db, storage } from "../config/firebase";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const reportesCollection = collection(db, "Problemas reportados");

// Único punto de entrada para crear una incidencia de soporte, sin
// importar si la genera un operador ("Reportar un problema") o un
// administrador ("Reporte de Problemas"): ambos flujos llaman a esta
// misma función, que siempre escribe en la colección que ya consume el
// módulo Soporte, nunca en una colección independiente. "tipoRemitente"
// ("usuario" | "administrador") es lo único que distingue el origen.
export async function createSupportTicket({
    user,
    tipoRemitente,
    asunto,
    descripcion,
    pantalla,
    imagenes = []
}) {

    const capturas = [];

    for (const file of imagenes) {
        const imageRef = ref(storage, `reportes-problemas/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(imageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        capturas.push(url);
    }

    const docRef = await addDoc(reportesCollection, {
        idUsuario: user?.id || null,
        uid: user?.uid || null,
        solicitante: user?.nombre || "ANÓNIMO",
        nomina: user?.nomina || "N/A",
        rol: user?.rol || "",
        area: user?.area || "",
        correo: user?.email || "",
        tipoRemitente: tipoRemitente || "usuario",
        asunto,
        pantalla,
        descripcion,
        capturas,
        estado: "Pendiente",
        comentarioAdmin: "",
        fecha: new Date().toLocaleDateString("es-MX"),
        fechaCreacion: serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null
    });

    return { success: true, id: docRef.id };
}
