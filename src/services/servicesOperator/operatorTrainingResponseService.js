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

const isResponseApproved = (data) => {
    if (typeof data?.aprobada === "boolean") {
        return data.aprobada;
    }

    const score = Number(data?.calificacion ?? data?.resultado ?? 0);
    return Number.isFinite(score) && score >= 80;
};

const getTrainingBucketCollection = (trainingId, approved) => {
    const bucket = approved ? "aprobados" : "reprobados";
    return collection(db, "respuestasCapacitaciones", String(trainingId), bucket);
};

// ======================
// GUARDAR RESPUESTA
// ======================
export const saveTrainingResponse = async (data) => {
    const responseRef = doc(responseCollection);
    const userDocId = await resolveUserDocIdByFirebaseUid(data?.userId);
    const anioActual = new Date().getFullYear();
    const trainingId = data?.capacitacionId ?? data?.idCapacitacion ?? data?.trainingId;
    const approved = isResponseApproved(data);
    const estado = approved ? "aprobado" : "reprobado";

    const batch = writeBatch(db);
    const baseResponse = {
        ...data,
        id: responseRef.id,
        estado,
        aprobada: approved,
    };

    batch.set(responseRef, baseResponse);

    if (trainingId) {
        const trainingBucketRef = doc(getTrainingBucketCollection(trainingId, approved));
        batch.set(trainingBucketRef, {
            ...baseResponse,
            id: trainingBucketRef.id,
            capacitacionId: trainingId,
            usuarioDocId: userDocId,
            tipo: "capacitacion",
            createdAt: new Date().toISOString(),
        });
    }

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
            ...baseResponse,
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
