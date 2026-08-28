import { Await } from "react-router-dom";
import { db } from "../config/firebase";

import { query, where, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

const surveyCollection = collection(db, "encuestas");

// AVISAR A NUEVOS ASIGNADOS

const normalizeAssignment = (assignment = {}) => {
    const tipo = assignment?.tipo || "global";
    const valores = Array.isArray(assignment?.valores) ? assignment.valores : [];

    if (tipo === "usuarios") {
        return {
            tipo: "usuarios",
            valores: valores.map(value => String(value).trim()).filter(Boolean)
        };
    }

    if (tipo === "area") {
        return {
            tipo: "area",
            valores: valores.map(value => String(value).trim()).filter(Boolean)
        };
    }

    return { tipo: "global", valores: [] };
};

const getAssignmentSignature = (assignment = {}) => {
    const normalized = normalizeAssignment(assignment);
    const values = [...normalized.valores].sort();
    return `${normalized.tipo}:${values.join("|")}`;
};

const getUsersToNotifyForSurvey = async (surveyData) => {
    const asignacion = surveyData?.asignacion || { tipo: "global", valores: [] };

    let usersQuery = query(collection(db, "users"), where("rol", "==", "operador"));

    if (asignacion.tipo === "area") {
        const areas = Array.isArray(asignacion.valores) ? asignacion.valores : [];
        if (areas.length > 0) {
            usersQuery = query(
                collection(db, "users"),
                where("rol", "==", "operador"),
                where("area", "in", areas)
            );
        }
    }

    if (asignacion.tipo === "usuarios") {
        const nominas = Array.isArray(asignacion.valores)
            ? asignacion.valores.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
            : [];

        if (nominas.length > 0) {
            usersQuery = query(
                collection(db, "users"),
                where("rol", "==", "operador"),
                where("nomina", "in", nominas)
            );
        }
    }

    const usersSnapshot = await getDocs(usersQuery);
    const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.data().uid,
        ...doc.data()
    }));

    if (asignacion.tipo === "global") {
        return allUsers.filter(user => user.uid);
    }

    return allUsers.filter(user => user.uid);
};

const createSurveyNotificationsBatch = async (surveyData, surveyId, usersToNotifyOverride) => {
    const usersToNotify = usersToNotifyOverride ?? await getUsersToNotifyForSurvey(surveyData);

    if (!usersToNotify.length) return 0;

    const batchSize = 500;
    let createdNotifications = 0;

    for (let i = 0; i < usersToNotify.length; i += batchSize) {
        const batch = writeBatch(db);
        const usersBatch = usersToNotify.slice(i, i + batchSize);

        usersBatch.forEach((user) => {
            const notificationRef = doc(collection(db, "notificaciones"));

            batch.set(notificationRef, {
                IdUsuario: user.uid,
                Titulo: "📋 Nueva Encuesta",
                Mensaje: `Se ha asignado una nueva encuesta: ${surveyData.titulo}`,
                Destino: "surveys",
                Accion: "nueva_encuesta",
                extra: {
                    encuestaId: surveyId,
                    encuestaTitulo: surveyData.titulo
                },
                enviado: false,
                fechaCreacion: serverTimestamp(),
                fechaEnviado: null,
            });
        });

        await batch.commit();
        createdNotifications += usersBatch.length;
    }

    return createdNotifications;
};

// Obtener encuestas
export const getSurveys = async () => {

    const auth = getAuth();

    const q = query(
        surveyCollection,
        where("userId", "==", auth.currentUser?.uid)
    );

    const snapshot = await getDocs(q);

    const surveys = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return surveys;
}

// Crear
export const createSurvey = async (surveyData) => {

    const surveyRef = await addDoc(surveyCollection, surveyData);

    try {
        await createSurveyNotificationsBatch(surveyData, surveyRef.id);
    } catch (error) {
        console.error("Error creando notificaciones para encuesta:", error);
    }

}

// Actualizar
export const updateSurvey = async (id, data) => {

    const ref = doc(db, "encuestas", id);
    const currentSnapshot = await getDoc(ref);
    const previousAssignment = currentSnapshot.exists() ? currentSnapshot.data()?.asignacion : null;
    const previousSignature = getAssignmentSignature(previousAssignment);
    const nextSignature = getAssignmentSignature(data?.asignacion);

    await updateDoc(ref, data);

    if (!previousAssignment || previousSignature === nextSignature) {
        return;
    }

    try {
        const usersToNotify = await getUsersToNotifyForSurvey(data);
        const previousUsers = await getUsersToNotifyForSurvey({ ...data, asignacion: previousAssignment });
        const newUsers = usersToNotify.filter(user => !previousUsers.some(prevUser => prevUser.uid === user.uid));

        if (!newUsers.length) return;

        await createSurveyNotificationsBatch(data, id, newUsers);
    } catch (error) {
        console.error("Error creando notificaciones al actualizar encuesta:", error);
    }

}

// Borrar
export const deleteSurvey = async (id) => {

    const ref = doc(db, "encuestas", id);

    await deleteDoc(ref);

}