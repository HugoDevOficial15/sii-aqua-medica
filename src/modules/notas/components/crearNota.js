import {
    createNota,
    updateNota,
    deleteNota
} from "../../../services/notasService";
import { sanitizeText, sanitizeTextTrim } from "../../../utils/sanitize";

// CREAR
export const crearNota = async ({ usuario, data }) => {
    const tituloSanitizado = sanitizeTextTrim(data.titulo || "");
    const contenidoSanitizado = sanitizeText(data.contenido || "").trim();
    const prioridadSanitizada = sanitizeTextTrim(data.prioridad || "media");

    if (!tituloSanitizado) {
        throw new Error("El título es obligatorio");
    }

    const now = new Date();

    const nuevaNota = {
        id: usuario.id, // 🔥 TU SISTEMA
        titulo: tituloSanitizado,
        contenido: contenidoSanitizado,
        prioridad: prioridadSanitizada || "media",
        estado: "activa",
        checklist: data.checklist || [],
        fechaLimite: sanitizeTextTrim(data.fechaLimite || "") || null,
        anio: now.getFullYear(),
        mes: now.getMonth() + 1,
        createdAt: now,
        updatedAt: now
    };

    return await createNota(nuevaNota);
};

// COMPLETAR
export const completarNota = async (nota) => {

    const nuevoEstado =
        nota.estado === "completada" ? "activa" : "completada";

    return await updateNota(nota.docId, { // 🔥 FIX
        estado: nuevoEstado
    });
};
export const editarNota = async ({ nota, data }) => {
    const tituloSanitizado = sanitizeTextTrim(data.titulo || "");
    const contenidoSanitizado = sanitizeText(data.contenido || "").trim();
    const prioridadSanitizada = sanitizeTextTrim(data.prioridad || nota.prioridad || "media");

    if (!tituloSanitizado) {
        throw new Error("El título es obligatorio");
    }

    return await updateNota(nota.docId, {
        titulo: tituloSanitizado,
        contenido: contenidoSanitizado,
        prioridad: prioridadSanitizada || "media",
        fechaLimite: sanitizeTextTrim(data.fechaLimite || nota.fechaLimite || "") || null,
        checklist: nota.checklist ?? [],
        estado: nota.estado ?? "activa",
        anio: nota.anio,
        mes: nota.mes
    });
};

// ELIMINAR
export const eliminarNota = async (nota) => {
    return await deleteNota(nota.docId); // 🔥 FIX
};