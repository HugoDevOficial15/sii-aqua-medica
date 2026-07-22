import { db } from "../../config/firebase";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";

const responseCollection =
    collection(
        db,
        "respuestasEncuestas"
    );

// ======================
// GUARDAR RESPUESTA
// ======================

export const saveSurveyResponse =
    async (data) => {

        await addDoc(
            responseCollection,
            data
        );

    };

// ======================
// RESPUESTAS DEL USUARIO (por nómina)
// ======================
// Descarga, en una sola consulta, todas las respuestas del usuario
// autenticado. Se usa para cruzar en memoria contra las encuestas
// asignadas, en vez de consultar una vez por cada encuesta.

export const getMyResponses =
    async (nominaUsuario) => {

        const q = query(
            responseCollection,
            where(
                "nominaUsuario",
                "==",
                nominaUsuario
            )
        );

        const snapshot =
            await getDocs(q);

        return snapshot.docs.map(doc => ({
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

        const q = query(
            responseCollection,
            where(
                "encuestaId",
                "==",
                surveyId
            ),
            where(
                "userId",
                "==",
                userId
            )
        );

        const snapshot =
            await getDocs(q);

        return !snapshot.empty;

    };

// ======================
// HISTORIAL
// ======================

export const getSurveyHistory =
    async (userId) => {

        const q = query(
            responseCollection,
            where(
                "userId",
                "==",
                userId
            )
        );

        const snapshot =
            await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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