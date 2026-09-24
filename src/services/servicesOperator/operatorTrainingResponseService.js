import { functions } from "../../config/firebase";
import { httpsCallable } from "firebase/functions";

const saveOperatorTrainingResponseFunction = httpsCallable(functions, "saveOperatorTrainingResponse");
const getOperatorTrainingResponsesFunction = httpsCallable(functions, "getOperatorTrainingResponses");
const hasOperatorAnsweredTrainingFunction = httpsCallable(functions, "hasOperatorAnsweredTraining");
const getOperatorTrainingHistoryFunction = httpsCallable(functions, "getOperatorTrainingHistory");

const callFunction = async (functionName, payload = {}) => {
    const result = await httpsCallable(functions, functionName)(payload);
    return result.data;
};

// ======================
// GUARDAR RESPUESTA
// ======================
export const saveTrainingResponse = async (data) => {
    const result = await saveOperatorTrainingResponseFunction(data);
    return result.data;
};

// ======================
// RESPUESTAS DEL USUARIO (por nómina)
// ======================
export const getMyTrainingResponses = async (nominaUsuario) => {
    if (!nominaUsuario) return [];

    const data = await callFunction("getOperatorTrainingHistory", { nominaUsuario });
    return data?.responses || [];
};

// ======================
// RESPUESTAS DE UNA CAPACITACIÓN (panel de Administrador)
// ======================
export const getResponsesForTraining = async (idCapacitacion) => {
    if (!idCapacitacion) return [];

    const data = await getOperatorTrainingResponsesFunction({ trainingId: idCapacitacion });
    return data?.responses || [];
};

// ======================
// YA RESPONDIÓ
// ======================
export const hasAnsweredTraining = async (trainingId, userId) => {
    if (!trainingId || !userId) return false;

    const data = await hasOperatorAnsweredTrainingFunction({ trainingId, userId });
    return Boolean(data?.answered);
};

// ======================
// HISTORIAL
// ======================
export const getTrainingHistory = async (userId) => {
    if (!userId) return [];

    const data = await getOperatorTrainingHistoryFunction({ userId });
    return data?.responses || [];
};

// ======================
// MÉTRICAS
// ======================
export const getTrainingMetrics = async (userId) => {
    const data = await getOperatorTrainingHistoryFunction({ userId });
    return data?.metrics || {
        respondidas: 0,
        aprobadas: 0,
        conRespuestasAbiertas: 0,
    };
};
