import { db, functions } from "../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

const saveOperatorTrainingResponseFunction = httpsCallable(functions, "saveOperatorTrainingResponse");

const getTrainingBucketCollection = (trainingId, bucketName) => {
    const bucket = bucketName || "aprobados";
    return collection(db, "respuestasCapacitaciones", String(trainingId), bucket);
};

// ======================
// GUARDAR RESPUESTA
// ======================
export const saveTrainingResponse = async (data) => {
    const result = await saveOperatorTrainingResponseFunction(data);
    return result.data;
};

// ======================
// RESPUESTAS DEL USUARIO (por nómina)
// ======================
export const getMyTrainingResponses = async (nominaUsuario) => {
    if (!nominaUsuario) return [];

    const rootSnapshot = await getDocs(query(collection(db, "respuestasCapacitaciones"), where("nominaUsuario", "==", nominaUsuario)));
    if (!rootSnapshot.empty) {
        return rootSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    return [];
};

// ======================
// RESPUESTAS DE UNA CAPACITACIÓN (panel de Administrador)
// ======================
// Busca por capacitacionId (también verifica idCapacitacion para compatibilidad)
export const getResponsesForTraining = async (idCapacitacion) => {
    if (!idCapacitacion) return [];

    const pendingDocs = await getDocs(query(getTrainingBucketCollection(idCapacitacion, "pendientes")));
    const approvedDocs = await getDocs(query(getTrainingBucketCollection(idCapacitacion, "aprobados")));
    const rejectedDocs = await getDocs(query(getTrainingBucketCollection(idCapacitacion, "reprobados")));

    return [...pendingDocs.docs, ...approvedDocs.docs, ...rejectedDocs.docs].map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// ======================
// YA RESPONDIÓ
// ======================
export const hasAnsweredTraining = async (trainingId, userId) => {
    if (!trainingId || !userId) return false;

    const buckets = ["pendientes", "aprobados", "reprobados"];

    for (const bucketName of buckets) {
        const snapshot = await getDocs(query(
            getTrainingBucketCollection(trainingId, bucketName),
            where("userId", "==", userId)
        ));

        if (!snapshot.empty) return true;
    }

    return false;
};

// ======================
// HISTORIAL
// ======================
export const getTrainingHistory = async (userId) => {
    if (!userId) return [];

    const rootSnapshot = await getDocs(query(collection(db, "respuestasCapacitaciones"), where("userId", "==", userId)));
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
export const getTrainingMetrics = async (userId) => {
    const history = await getTrainingHistory(userId);

    return {
        respondidas: history.length,
        aprobadas: history.filter(item => item.calificacion >= 80).length,
        conRespuestasAbiertas: history.filter(item => item.tieneRespuestasAbiertas).length
    };
};
