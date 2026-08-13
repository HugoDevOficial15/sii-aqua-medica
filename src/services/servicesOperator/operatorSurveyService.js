import { getEncuestasDisponibles } from "../encuestasService";

// DEPRECATED: Usa getEncuestasDisponibles del servicio centralizado en su lugar.
// Esta función se mantiene por compatibilidad pero debería evitarse en código nuevo.
export const getOperatorSurveys = async (usuario) => {
    try {
        if (!usuario) {
            console.warn("⚠️  getOperatorSurveys necesita un objeto usuario. Usa getEncuestasDisponibles en su lugar.");
            return [];
        }

        // Delega al servicio centralizado que ya hace el filtrado por asignación
        const surveys = await getEncuestasDisponibles(usuario);
        return surveys;
    } catch (error) {
        console.error("Error en getOperatorSurveys:", error);
        return [];
    }
};