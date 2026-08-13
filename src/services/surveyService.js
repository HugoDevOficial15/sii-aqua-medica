import { Await } from "react-router-dom";
import { db } from "../config/firebase";

import { query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { createNotification } from "../utils/createNotification";

const surveyCollection = collection(db, "encuestas");


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

    // Crear notificaciones para usuarios asignados
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.data().uid,
            ...doc.data()
        }));

        const usersToNotify = [];

        if (surveyData.asignacion?.tipo === "global") {
            // Notificar a todos los usuarios
            usersToNotify.push(...allUsers);
        } else if (surveyData.asignacion?.tipo === "area") {
            // Notificar a usuarios en las áreas seleccionadas
            const areas = surveyData.asignacion.valores || [];
            usersToNotify.push(
                ...allUsers.filter(user => areas.includes(user.area))
            );
        } else if (surveyData.asignacion?.tipo === "usuarios") {
            // Notificar a usuarios específicos por nómina
            const nominas = surveyData.asignacion.valores || [];
            usersToNotify.push(
                ...allUsers.filter(user =>
                    nominas.includes(String(user.nomina))
                )
            );
        }

        // Crear notificaciones para cada usuario con identificador único de encuesta
        for (const user of usersToNotify) {
            if (user.uid) {
                await createNotification({
                    IdUsuario: user.uid,
                    Titulo: "📋 Nueva Encuesta",
                    Mensaje: `Se ha asignado una nueva encuesta: ${surveyData.titulo}`,
                    Destino: "surveys",
                    Accion: "nueva_encuesta",
                    extra: {
                        encuestaId: surveyRef.id,
                        encuestaTitulo: surveyData.titulo
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error creando notificaciones para encuesta:", error);
        // No lanzamos el error para que la encuesta se haya creado aunque falle la notificación
    }

}

// Actuzalizar
export const updateSurvey = async (id, data) => {

    const ref = doc(db, "encuestas", id);

    await updateDoc(ref, data);

}

// Borrar
export const deleteSurvey = async (id) => {

    const ref = doc(db, "encuestas", id);

    await deleteDoc(ref);

}