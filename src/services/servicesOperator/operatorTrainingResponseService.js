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
    if (data?.estadoActual === "pendiente_validacion" || data?.tieneRespuestasAbiertas) {
        return false;
    }

    if (typeof data?.aprobada === "boolean") {
        return data.aprobada;
    }

    const score = Number(data?.calificacion ?? data?.resultado ?? 0);
    return Number.isFinite(score) && score >= 80;
};

const getTrainingBucketCollection = (trainingId, bucketName) => {
    const bucket = bucketName || "aprobados";
    return collection(db, "respuestasCapacitaciones", String(trainingId), bucket);
};

// ======================
// GUARDAR RESPUESTA
// ======================
export const saveTrainingResponse = async (data) => {
    const userDocId = await resolveUserDocIdByFirebaseUid(data?.userId);
    const anioActual = new Date().getFullYear();
    const trainingId = data?.capacitacionId ?? data?.idCapacitacion ?? data?.trainingId;
    const isPendingReview = Boolean(data?.estadoActual === "pendiente_validacion" || data?.tieneRespuestasAbiertas);
    const approved = isPendingReview ? false : isResponseApproved(data);
    const bucketName = isPendingReview ? "pendientes" : (approved ? "aprobados" : "reprobados");
    const estado = isPendingReview ? "pendiente_validacion" : (approved ? "aprobado" : "reprobado");

    const batch = writeBatch(db);
    const baseResponse = {
        ...data,
        id: `${trainingId ?? "training"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        estado,
        aprobada: approved,
    };

    if (trainingId) {
        const trainingBucketRef = doc(getTrainingBucketCollection(trainingId, bucketName));
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
