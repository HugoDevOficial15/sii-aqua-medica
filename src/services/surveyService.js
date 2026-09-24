import { functions } from "../config/firebase";
import { clearSurveyCaches } from "./encuestasService";
import { readSessionCache, writeSessionCache, clearCachedData } from "../utils/cacheStore";
import { httpsCallable } from "firebase/functions";

const CACHE_KEY = "sii-aqua-surveys-cache";

const getSurveysFunction = httpsCallable(functions, "getSurveys");
const createSurveyFunction = httpsCallable(functions, "createSurvey");
const updateSurveyFunction = httpsCallable(functions, "updateSurvey");
const deleteSurveyFunction = httpsCallable(functions, "deleteSurvey");
const getResponsesForAdminFunction = httpsCallable(functions, "getSurveyResponsesForAdmin");
const reviewSurveyResponseFunction = httpsCallable(functions, "reviewSurveyResponse");

// Obtener encuestas
export const getSurveys = async () => {
    const cached = readSessionCache(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const result = await getSurveysFunction();
    const surveys = result.data;

    writeSessionCache(CACHE_KEY, surveys);
    return surveys;
}

// Crear
export const createSurvey = async (surveyData) => {
    const result = await createSurveyFunction(surveyData);

    clearSurveyCaches();
    clearCachedData(CACHE_KEY);
    return result.data;
}

// Actualizar
export const updateSurvey = async (id, data) => {
    const result = await updateSurveyFunction({ id, ...data });

    clearSurveyCaches();
    clearCachedData(CACHE_KEY);
    return result.data;
}

// Borrar
export const deleteSurvey = async (id) => {
    const result = await deleteSurveyFunction({ id });
    clearCachedData(CACHE_KEY);
    clearSurveyCaches();
    return result.data;
}

export const getResponsesForAdmin = async ({ surveyId, collectionName = "respuestasEncuestas" }) => {
    if (!surveyId) return [];
    const result = await getResponsesForAdminFunction({ surveyId, collectionName });
    return result.data?.responses || [];
};

export const reviewSurveyResponse = async ({
    surveyId,
    responseId,
    response,
    collectionName = "respuestasEncuestas",
    finalBucket = "aprobados",
    finalState = "aprobado",
}) => {
    if (!surveyId || !responseId) return null;

    const result = await reviewSurveyResponseFunction({
        surveyId,
        responseId,
        response,
        collectionName,
        finalBucket,
        finalState,
    });

    return result.data;
};