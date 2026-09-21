import { functions } from "../config/firebase";
import { clearSurveyCaches } from "./encuestasService";
import { readSessionCache, writeSessionCache, clearCachedData } from "../utils/cacheStore";
import { httpsCallable } from "firebase/functions";

const CACHE_KEY = "sii-aqua-surveys-cache";

const getSurveysFunction = httpsCallable(functions, "getSurveys");
const createSurveyFunction = httpsCallable(functions, "createSurvey");
const updateSurveyFunction = httpsCallable(functions, "updateSurvey");
const deleteSurveyFunction = httpsCallable(functions, "deleteSurvey");

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