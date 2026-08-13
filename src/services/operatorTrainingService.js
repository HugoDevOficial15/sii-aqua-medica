import { getCapacitacionesDisponibles } from "./capacitacionesService";

// DEPRECATED: Usa useOperatorTrainings() hook o getCapacitacionesDisponibles directamente.
// Esta función se mantiene por compatibilidad, pero requiere el objeto usuario completo.
export const getOperatorTrainings = async (userArea, userId, usuarioCompleto = null) => {
    try {
        console.log("⚠️  getOperatorTrainings es deprecated. Usa useOperatorTrainings() hook en su lugar.");

        // Priorizar objeto usuario completo si se proporciona
        // Si no, crear uno mínimo (puede no funcionar correctamente si necesita nomina)
        const usuario = usuarioCompleto || {
            area: userArea,
            uid: userId,
            id: userId,
            nomina: null,
            username: null
        };

        const trainingsEnriquecidas = await getCapacitacionesDisponibles(usuario);
        console.log("📊 Total capacitaciones para operador:", trainingsEnriquecidas.length);
        return trainingsEnriquecidas;
    } catch (error) {
        console.error("Error fetching operator trainings:", error);
        return [];
    }
}

// Obtener conteos por estado (ahora basado en el objeto capacitacion enriquecido)
export const getTrainingStats = (trainings) => {
    return {
        pendientes: trainings.filter(t => (t.estado || "pendiente") === "pendiente").length,
        aprobadas: trainings.filter(t => t.estado === "completada" && (t.miPuntaje >= 80)).length,
        certificados: trainings.filter(t => t.estado === "certificado").length
    };
}