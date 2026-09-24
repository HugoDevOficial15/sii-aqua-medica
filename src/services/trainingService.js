import { functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import { readSessionCache, writeSessionCache, clearCachedData } from "../utils/cacheStore";

const CACHE_KEY = "sii-aqua-trainings-cache";
const getTrainingFunction = httpsCallable(functions, "getTraining");
const createTrainingFunction = httpsCallable(functions, "createTraining");
const updateTrainingFunction = httpsCallable(functions, "updateTraining");
const deleteTrainingFunction = httpsCallable(functions, "deleteTraining");
const getTrainingResponsesForAdminFunction = httpsCallable(functions, "getSurveyResponsesForAdmin");
const certifyTrainingResponsesFunction = httpsCallable(functions, "certifyTrainingResponses");

export const clearTrainingCaches = () => {
    if (typeof window === "undefined") return;

    const keysToRemove = new Set();

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (
            key === CACHE_KEY ||
            key.startsWith(`session-cache:${CACHE_KEY}`)
        ) {
            keysToRemove.add(key);
        }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    clearCachedData(CACHE_KEY);
};

// Obtener capacitaciones (del admin que las crea)
export const getTraining = async () => {
    const cached = readSessionCache(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const result = await getTrainingFunction();
    const trainings = result.data;

    writeSessionCache(CACHE_KEY, trainings);
    return trainings;
}

// Crear capacitación y notificar a usuarios asignados
export const createTraining = async (trainingData) => {
    const result = await createTrainingFunction(trainingData);
    clearTrainingCaches();
    return result.data;
}

// Actualizar
export const updateTraining = async (id, data) => {
    const result = await updateTrainingFunction({ id, ...data });
    clearTrainingCaches();
    return result.data;
}

// Borrar
export const deleteTraining = async (id) => {
    const result = await deleteTrainingFunction({ id });
    clearTrainingCaches();
    return result.data;
}

export const getTrainingResponsesForAdmin = async (trainingId) => {
    if (!trainingId) return [];
    const result = await getTrainingResponsesForAdminFunction({
        surveyId: trainingId,
        collectionName: "respuestasCapacitaciones",
    });
    return result.data?.responses || [];
};

export const certifyTrainingResponses = async ({ trainingId, userResponses = [] }) => {
    if (!trainingId) return { ok: false, count: 0 };

    const result = await certifyTrainingResponsesFunction({
        surveyId: trainingId,
        collectionName: "respuestasCapacitaciones",
        userResponses,
    });

    return result.data || { ok: false, count: 0 };
};
