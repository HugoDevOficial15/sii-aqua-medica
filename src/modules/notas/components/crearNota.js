import {
    createNota,
    updateNota,
    deleteNota
} from "../../../services/notasService";
import { sanitizeText, sanitizeTextTrim } from "../../../utils/sanitize";
import Swal from "sweetalert2";

// CREAR
export const crearNota = async ({ usuario, data }) => {
    const tituloSanitizado = sanitizeText(data.titulo || "");
    const contenidoSanitizado = sanitizeText(data.contenido || "").trim();
    const prioridadSanitizada = sanitizeText(data.prioridad || "media");

    if (!tituloSanitizado) {
        throw new Error("El título es obligatorio");
    }

    const now = new Date();
    const userId = usuario?.id ?? usuario?.uid ?? null;

    if (!userId) {
        throw new Error("No se pudo identificar al usuario propietario de la nota.");
    }

    const nuevaNota = {
        userId,
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

    try {
        Swal.fire({
            title: "Creando nota",
            icon: "info",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        return await createNota(nuevaNota);
    } finally {
        Swal.close();
    }
};

// COMPLETAR
export const completarNota = async (nota) => {
    const nuevoEstado = nota.estado === "completada" ? "activa" : "completada";

    try {
        Swal.fire({
            title: "Actualizando estado de la nota",
            icon: "info",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        return await updateNota(nota.id, {
            estado: nuevoEstado
        });
    } finally {
        Swal.close();
    }
};

// EDITAR
export const editarNota = async ({ nota, data }) => {
    const tituloSanitizado = sanitizeTextTrim(data.titulo || "");
    const contenidoSanitizado = sanitizeText(data.contenido || "").trim();
    const prioridadSanitizada = sanitizeTextTrim(data.prioridad || nota.prioridad || "media");

    if (!tituloSanitizado) {
        throw new Error("El título es obligatorio");
    }

    try {
        Swal.fire({
            title: "Guardando nota",
            icon: "info",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        return await updateNota(nota.id, {
            titulo: tituloSanitizado,
            contenido: contenidoSanitizado,
            prioridad: prioridadSanitizada || "media",
            fechaLimite: sanitizeTextTrim(data.fechaLimite || nota.fechaLimite || "") || null,
            checklist: nota.checklist ?? [],
            estado: nota.estado ?? "activa",
            anio: nota.anio,
            mes: nota.mes
        });
    } finally {
        Swal.close();
    }
};

// ELIMINAR
export const eliminarNota = async (nota) => {
    try {
        Swal.fire({
            title: "Eliminando nota",
            icon: "info",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        return await deleteNota(nota.id);
    } finally {
        Swal.close();
    }
};