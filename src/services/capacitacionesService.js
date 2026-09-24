import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const getOperatorTrainingsFunction = httpsCallable(functions, "getOperatorTrainings");

// ============================================================
// CONSULTA DE CAPACITACIONES DISPONIBLES PARA UN USUARIO
// ============================================================
// Filtra capacitaciones según el rol del usuario y la asignación:
// 1. Globales: visibles para todos
// 2. Por área: solo si user.area está en asignacion.valores
// 3. Por usuario: solo si user.nomina está en asignacion.valores
// Además, cruza con la colección "respuestasCapacitaciones" para determinar
// si ya respondió y otros estados.
export const getCapacitacionesDisponibles = async (usuario) => {
    if (!usuario) return [];

    try {
        const result = await getOperatorTrainingsFunction({
            userId: usuario.id || usuario.uid || null,
            nomina: usuario.nomina || usuario.nominaUsuario || usuario.numeroNomina || null,
        });

        const capacitaciones = result.data?.trainings || [];
        return capacitaciones.map((capacitacion) => ({
            ...capacitacion,
            id: String(capacitacion.id),
            preguntas: Array.isArray(capacitacion.preguntas) ? capacitacion.preguntas : [],
            estadoActual: capacitacion.estadoActual || capacitacion.estado || "pendiente",
            disponible: capacitacion.disponible !== false,
        }));
    } catch (error) {
        console.error("Error al obtener capacitaciones disponibles:", error);
        return [];
    }
};

// ============================================================
// CONTAR CAPACITACIONES PENDIENTES
// ============================================================
// Devuelve el número de capacitaciones que el usuario aún no ha
// respondido y que no están vencidas.
export const contarCapacitacionesPendientes = async (usuario) => {
    const capacitaciones = await getCapacitacionesDisponibles(usuario);
    return capacitaciones.filter(e => e.disponible).length;
};
