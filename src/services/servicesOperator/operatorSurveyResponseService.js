import { db } from "../../config/firebase";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";

// ============================================================
// COLECCIÓN ÚNICA DE RESPUESTAS DE ENCUESTAS
// ============================================================
// Todas las respuestas se guardan y consultan en "respuestasEncuestas"
// para evitar inconsistencias de nombres en diferentes partes del código.
const responseCollection =
    collection(
        db,
        "respuestasEncuestas"
    );

// ======================
// GUARDAR RESPUESTA
// ======================
// Guarda la respuesta del usuario con todos los metadatos necesarios
// para poder reconstruir el resultado posteriormente sin depender de
// cálculos en tiempo real.
export const saveSurveyResponse =
    async (data) => {

        await addDoc(
            responseCollection,
            data
        );

    };

// ======================
// RESPUESTAS DEL USUARIO (por userId)
// ======================
// Descarga todas las respuestas del usuario autenticado.
// Se usa para cruzar en memoria contra las encuestas asignadas.

export const getMyResponses =
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

// Alias para búsqueda por nómina (algunos componentes antiguos pueden usarlo)
export const getMyResponsesByNomina =
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
// RESPUESTAS DE UNA ENCUESTA (panel de Administrador)
// ======================
export const getResponsesForSurvey =
    async (idEncuesta) => {

        const q = query(
            responseCollection,
            where(
                "encuestaId",
                "==",
                idEncuesta
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