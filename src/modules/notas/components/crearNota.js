import {
    createNota,
    updateNota,
    deleteNota
} from "../../../services/notasService";

// CREAR
export const crearNota = async ({ usuario, data }) => {

    if (!data.titulo?.trim()) {
        throw new Error("El título es obligatorio");
    }

    const now = new Date();

    const nuevaNota = {
        id: usuario.id, // 🔥 TU SISTEMA
        titulo: data.titulo,
        contenido: data.contenido || "",
        prioridad: data.prioridad || "media",
        estado: "activa",
        checklist: data.checklist || [],
        fechaLimite: data.fechaLimite || null,
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

    if (!data.titulo?.trim()) {
        throw new Error("El título es obligatorio");
    }

    return await updateNota(nota.docId, {
        titulo: data.titulo ?? nota.titulo,
        contenido: data.contenido ?? nota.contenido,
        prioridad: data.prioridad ?? nota.prioridad,
        fechaLimite: data.fechaLimite ?? nota.fechaLimite,
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