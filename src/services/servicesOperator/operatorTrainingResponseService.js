import { db } from "../../config/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";

const responseCollection = collection(db, "respuestasCapacitaciones");

// ======================
// GUARDAR RESPUESTA
// ======================
export const saveTrainingResponse = async (data) => {
    await addDoc(responseCollection, data);
};

// ======================
// RESPUESTAS DEL USUARIO (por nómina)
// ======================
export const getMyTrainingResponses = async (nominaUsuario) => {
    const q = query(
        responseCollection,
        where("nominaUsuario", "==", nominaUsuario)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// ======================
// RESPUESTAS DE UNA CAPACITACIÓN (panel de Administrador)
// ======================
// Busca por capacitacionId (también verifica idCapacitacion para compatibilidad)
export const getResponsesForTraining = async (idCapacitacion) => {
    const q = query(
        responseCollection,
        where("capacitacionId", "==", idCapacitacion)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// ======================
// YA RESPONDIÓ
// ======================
export const hasAnsweredTraining = async (trainingId, userId) => {
    const q = query(
        responseCollection,
        where("capacitacionId", "==", trainingId),
        where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    return !snapshot.empty;
};

// ======================
// HISTORIAL
// ======================
export const getTrainingHistory = async (userId) => {
    const q = query(
        responseCollection,
        where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// ======================
// MÉTRICAS
// ======================
export const getTrainingMetrics = async (userId) => {
    const history = await getTrainingHistory(userId);

    return {
        respondidas: history.length,
        aprobadas: history.filter(item => item.calificacion >= 80).length,
        conRespuestasAbiertas: history.filter(item => item.tieneRespuestasAbiertas).length
    };
};
