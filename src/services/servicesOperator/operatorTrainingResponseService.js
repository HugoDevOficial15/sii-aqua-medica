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

const responseCollection = collection(db, "respuestasCapacitaciones");

const resolveUserDocIdByFirebaseUid = async (userId) => {
    if (!userId) return null;

    try {
        const q = query(collection(db, "users"), where("uid", "==", userId));
        const snapshot = await getDocs(q);
        return snapshot.empty ? null : snapshot.docs[0].id;
    } catch (error) {
        console.error("Error resolviendo el docId del usuario para capacitaciones:", error);
        return null;
    }
};

// ======================
// GUARDAR RESPUESTA
// ======================
export const saveTrainingResponse = async (data) => {
    const responseRef = doc(responseCollection);
    const userDocId = await resolveUserDocIdByFirebaseUid(data?.userId);
    const anioActual = new Date().getFullYear();

    const batch = writeBatch(db);
    batch.set(responseRef, {
        ...data,
        id: responseRef.id,
    });

    if (userDocId) {
        const userYearTrainingResultsCollection = collection(
            db,
            "users",
            userDocId,
            String(anioActual),
            "informacion",
            "Resultados",
            "Capacitaciones",
            "items"
        );

        const userYearTrainingResultsRef = doc(userYearTrainingResultsCollection);

        batch.set(userYearTrainingResultsRef, {
            ...data,
            id: userYearTrainingResultsRef.id,
            usuarioDocId: userDocId,
            tipo: "capacitacion",
            createdAt: new Date().toISOString(),
        });
    }

    await batch.commit();
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
