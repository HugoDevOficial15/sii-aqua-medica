import { functions } from "../../config/firebase";
import { httpsCallable } from "firebase/functions";

const saveOperatorSurveyResponseFunction = httpsCallable(functions, "saveOperatorSurveyResponse");
const getSurveyDetailFunction = httpsCallable(functions, "getSurveyDetail");
const getSurveyAttemptsFunction = httpsCallable(functions, "getSurveyAttempts");
const getMySurveyResponsesFunction = httpsCallable(functions, "getMySurveyResponses");
const getSurveyResponsesForAdminFunction = httpsCallable(functions, "getSurveyResponsesForAdmin");
const hasAnsweredSurveyFunction = httpsCallable(functions, "hasAnsweredSurvey");
const getSurveyHistoryFunction = httpsCallable(functions, "getSurveyHistory");
const getSurveyMetricsFunction = httpsCallable(functions, "getSurveyMetrics");

export const getSurveyDetail = async (surveyId) => {
    if (!surveyId) return null;
    const result = await getSurveyDetailFunction({ surveyId });
    return result.data?.survey ?? null;
};

export const getSurveyAttempts = async (surveyId, userId) => {
    if (!surveyId) return { attempts: 0, responses: [] };
    const result = await getSurveyAttemptsFunction({ surveyId, userId });
    return result.data || { attempts: 0, responses: [] };
};

export const saveSurveyResponse = async (data) => {
    const result = await saveOperatorSurveyResponseFunction(data);
    return result.data;
};

export const getMyResponses = async (userId) => {
    if (!userId) return [];
    const result = await getMySurveyResponsesFunction({ userId });
    return result.data?.responses || [];
};

export const getMyResponsesByNomina = async (nominaUsuario) => {
    if (!nominaUsuario) return [];
    const result = await getMySurveyResponsesFunction({ userId: nominaUsuario });
    return result.data?.responses || [];
};

export const getResponsesForSurvey = async (idEncuesta) => {
    if (!idEncuesta) return [];
    const result = await getSurveyResponsesForAdminFunction({ surveyId: idEncuesta });
    return result.data?.responses || [];
};

export const hasAnsweredSurvey = async (surveyId, userId) => {
    if (!surveyId || !userId) return false;
    const result = await hasAnsweredSurveyFunction({ surveyId, userId });
    return Boolean(result.data?.answered);
};

export const getSurveyHistory = async (userId) => {
    if (!userId) return [];
    const result = await getSurveyHistoryFunction({ userId });
    return result.data?.history || [];
};

export const getSurveyMetrics = async (userId) => {
    if (!userId) return { respondidas: 0, reprobadas: 0 };
    const result = await getSurveyMetricsFunction({ userId });
    return {
        respondidas: Number(result.data?.respondidas || 0),
        reprobadas: Number(result.data?.reprobadas || 0),
    };
};