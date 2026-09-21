import { db } from "../../config/firebase";
import { functions } from "../../config/firebase";
import { httpsCallable } from "firebase/functions";

import {
    collection,
    addDoc,
    doc,
    getDocs,
    query,
    where,
    writeBatch
} from "firebase/firestore";

const saveOperatorSurveyResponseFunction = httpsCallable(functions, "saveOperatorSurveyResponse");

// ============================================================
// COLECCIÓN ÚNICA DE RESPUESTAS DE ENCUESTAS
// ============================================================
// Todas las respuestas se guardan y consultan en "respuestasEncuestas"
// para evitar inconsistencias de nombres en diferentes partes del código.
const resolveUserDocIdByFirebaseUid = async (userId) => {
    if (!userId) return null;

    try {
        const q = query(collection(db, "users"), where("uid", "==", userId));
        const snapshot = await getDocs(q);
        return snapshot.empty ? null : snapshot.docs[0].id;
    } catch (error) {
        console.error("Error resolviendo el docId del usuario para Resultados:", error);
        return null;
    }
};

const isResponseApproved = (data) => {
    if (data?.estadoActual === "pendiente_validacion" || data?.tieneRespuestasAbiertas) {
        return false;
    }

    if (typeof data?.aprobada === "boolean") {
        return data.aprobada;
    }

    const score = Number(data?.calificacion ?? data?.resultado ?? 0);
    return Number.isFinite(score) && score >= 80;
};

const getSurveyBucketCollection = (surveyId, bucketName) => {
    const bucket = bucketName || "aprobados";
    return collection(db, "respuestasEncuestas", String(surveyId), bucket);
};

// ======================
// GUARDAR RESPUESTA
// ======================
// Guarda la respuesta del usuario con todos los metadatos necesarios
// para poder reconstruir el resultado posteriormente sin depender de
// cálculos en tiempo real.
export const saveSurveyResponse =
    async (data) => {
        const result = await saveOperatorSurveyResponseFunction(data);
        return result.data;
    };

// ======================
// RESPUESTAS DEL USUARIO (por userId)
// ======================
// Descarga todas las respuestas del usuario autenticado.
// Se usa para cruzar en memoria contra las encuestas asignadas.

export const getMyResponses =
    async (userId) => {
        if (!userId) return [];

        const allCollections = [
            collection(db, "respuestasEncuestas"),
        ];

        const snapshots = await Promise.all(
            allCollections.map(async (collectionRef) => getDocs(query(collectionRef, where("userId", "==", userId))))
        );

        return snapshots.flatMap(snapshot =>
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        );
    };

// Alias para búsqueda por nómina (algunos componentes antiguos pueden usarlo)
export const getMyResponsesByNomina =
    async (nominaUsuario) => {
        if (!nominaUsuario) return [];

        const allCollections = [
            collection(db, "respuestasEncuestas"),
        ];

        const snapshots = await Promise.all(
            allCollections.map(async (collectionRef) => getDocs(query(collectionRef, where("nominaUsuario", "==", nominaUsuario))))
        );

        return snapshots.flatMap(snapshot =>
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        );
    };

// ======================
// RESPUESTAS DE UNA ENCUESTA (panel de Administrador)
// ======================
export const getResponsesForSurvey =
    async (idEncuesta) => {
        if (!idEncuesta) return [];

        const approvedDocs = await getDocs(query(getSurveyBucketCollection(idEncuesta, true)));
        const rejectedDocs = await getDocs(query(getSurveyBucketCollection(idEncuesta, false)));

        return [...approvedDocs.docs, ...rejectedDocs.docs].map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    };

// ======================
// YA RESPONDIÓ
// ======================

export const hasAnsweredSurvey =
    async (
        surveyId,
        userId
    ) => {
        if (!surveyId || !userId) return false;

        const approvedSnapshot = await getDocs(query(
            getSurveyBucketCollection(surveyId, true),
            where("userId", "==", userId)
        ));

        if (!approvedSnapshot.empty) return true;

        const rejectedSnapshot = await getDocs(query(
            getSurveyBucketCollection(surveyId, false),
            where("userId", "==", userId)
        ));

        return !rejectedSnapshot.empty;
    };

// ======================
// HISTORIAL
// ======================

export const getSurveyHistory =
    async (userId) => {
        if (!userId) return [];

        const rootSnapshot = await getDocs(query(collection(db, "respuestasEncuestas"), where("userId", "==", userId)));
        if (!rootSnapshot.empty) {
            return rootSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        return [];
    };

// ======================
// MÉTRICAS
// ======================

export const getSurveyMetrics =
    async (userId) => {

        const history =
            await getSurveyHistory(
                userId
            );

        return {

            respondidas:
                history.length,

            reprobadas:
                history.filter(
                    item =>
                        item.calificacion < 80
                ).length

        };

    };