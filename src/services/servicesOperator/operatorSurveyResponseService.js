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