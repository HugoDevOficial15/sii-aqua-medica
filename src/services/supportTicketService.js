import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { sendAdminNotification } from "../utils/sendAdminNotification";

const createSupportTicketFunction = httpsCallable(functions, "createSupportTicket");
const cargarProblemasFunction = httpsCallable(functions, "cargarProblemas");
const cambiarEstadoFunction = httpsCallable(functions, "cambiarEstado");
const eliminarProblemaFunction = httpsCallable(functions, "handleEliminarProblema");

export async function createSupportTicket({
    user,
    tipoRemitente,
    asunto,
    descripcion,
    pantalla,
    capturas,
    imagenes,
}) {
    const imagenBase64 = typeof capturas === "string"
        ? capturas
        : Array.isArray(capturas)
            ? capturas[0] || ""
            : typeof imagenes === "string"
                ? imagenes
                : Array.isArray(imagenes)
                    ? imagenes[0] || ""
                    : "";

    const result = await createSupportTicketFunction({
        user,
        tipoRemitente,
        asunto,
        descripcion,
        pantalla,
        capturas: imagenBase64,
    });

    sendAdminNotification({
        Titulo: "Nuevo Reporte de Problema",
        Mensaje: `${user?.nombre || "Un usuario"} reportó: "${asunto}"`,
        Destino: "soporte",
        Accion: "nuevo_reporte",
        extra: {
            reporteId: result?.data?.id,
            solicitante: user?.nombre,
            asunto,
            pantalla,
        },
    }, ["admin_sistemas", "admin_super"]).catch((err) => {
        console.error("Error enviando notificación de reporte:", err);
    });

    return result?.data || { success: true };
}

export async function cargarProblemas() {
    const result = await cargarProblemasFunction();
    return result?.data?.lista ?? [];
}

export async function cambiarEstadoProblema({ id, nuevoEstado, comentarioAdmin = "" }) {
    const result = await cambiarEstadoFunction({
        id,
        nuevoEstado,
        comentarioAdmin,
    });

    return result?.data || { success: true };
}

export async function eliminarProblema({ id }) {
    const result = await eliminarProblemaFunction({ id });
    return result?.data || { success: true };
}