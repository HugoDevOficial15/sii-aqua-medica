import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { sendAdminNotification } from "../utils/sendAdminNotification";

const reportesCollection = collection(db, "Problemas reportados");

// Único punto de entrada para crear una incidencia de soporte.
// ACTUALIZADO: Ya no sube archivos a Firebase Storage.
// Espera recibir la imagen (si la hay) directamente como un string Base64 en 'capturas'.
export async function createSupportTicket({
    user,
    tipoRemitente,
    asunto,
    descripcion,
    pantalla,
    capturas // 🔥 Ahora esperamos un string (Data URL en Base64), no un array de archivos.
}) {
    
    // Validamos que 'capturas' sea un string, si es undefined lo mandamos vacío
    const imagenBase64 = typeof capturas === 'string' ? capturas : "";

    const docRef = await addDoc(reportesCollection, {
        idUsuario: user?.uid || null,  // ✅ Usar Firebase UID (no user.id)
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
        capturas: imagenBase64, // 🔥 Guardamos el string Base64 directamente (como foto de perfil)
        estado: "Pendiente",
        comentarioAdmin: "",
        fecha: new Date().toLocaleDateString("es-MX"),
        fechaCreacion: serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null
    });

    await sendAdminNotification({
        Titulo: "Nuevo Reporte de Problema",
        Mensaje: `${user?.nombre || "Un usuario"} reportó: "${asunto}"`,
        Destino: "soporte",
        Accion: "nuevo_reporte",
        extra: {
            reporteId: docRef.id,
            solicitante: user?.nombre,
            asunto: asunto,
            pantalla: pantalla
        }
    }, ["admin_sistemas", "admin_super"]);

    return { success: true, id: docRef.id };
}