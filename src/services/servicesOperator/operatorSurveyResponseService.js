import { db } from "../../config/firebase";

import {
    collection,
    addDoc,
    doc,
    getDocs,
    query,
    where,
    writeBatch
} from "firebase/firestore";

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
        const userDocId = await resolveUserDocIdByFirebaseUid(data?.userId);
        const anioActual = new Date().getFullYear();
        const surveyId = data?.encuestaId ?? data?.idEncuesta ?? data?.surveyId;
        const isPendingReview = Boolean(data?.estadoActual === "pendiente_validacion" || data?.tieneRespuestasAbiertas);
        const approved = isPendingReview ? false : isResponseApproved(data);
        const bucketName = isPendingReview ? "pendientes" : (approved ? "aprobados" : "reprobados");
        const estado = isPendingReview ? "pendiente_validacion" : (approved ? "aprobado" : "reprobado");

        const batch = writeBatch(db);
        const baseResponse = {
            ...data,
            id: `${surveyId ?? "survey"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            estado,
            aprobada: approved,
        };

        if (surveyId) {
            const surveyBucketRef = doc(getSurveyBucketCollection(surveyId, bucketName));
            batch.set(surveyBucketRef, {
                ...baseResponse,
                id: surveyBucketRef.id,
                encuestaId: surveyId,
                usuarioDocId: userDocId,
                tipo: "encuesta",
                createdAt: new Date().toISOString(),
            });
        }

        if (userDocId) {
            const userYearSurveyResultsCollection = collection(
                db,
                "users",
                userDocId,
                String(anioActual),
                "informacion",
                "Resultados",
                "Encuestas",
                "items"
            );

            const userYearSurveyResultsRef = doc(userYearSurveyResultsCollection);

            batch.set(userYearSurveyResultsRef, {
                ...baseResponse,
                id: userYearSurveyResultsRef.id,
                usuarioDocId: userDocId,
                tipo: "encuesta",
                createdAt: new Date().toISOString(),
            });
        }

        await batch.commit();
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