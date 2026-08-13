import { db } from "../config/firebase";
import { query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { createNotification } from "../utils/createNotification";

const trainingCollection = collection(db, "capacitaciones");

// Obtener capacitaciones (del admin que las crea)
export const getTrainings = async () => {
    const auth = getAuth();

    const q = query(
        trainingCollection,
        where("userId", "==", auth.currentUser?.uid)
    );

    const snapshot = await getDocs(q);

    const trainings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return trainings;
}

// Crear capacitación y notificar a usuarios asignados
export const createTraining = async (trainingData) => {
    const trainingRef = await addDoc(trainingCollection, trainingData);

    // Crear notificaciones para usuarios asignados
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.data().uid,
            nomina: doc.data().nomina,
            area: doc.data().area,
            ...doc.data()
        }));

        const usersToNotify = [];

        if (trainingData.asignacion?.tipo === "global") {
            // Notificar a todos los usuarios
            usersToNotify.push(...allUsers);
        } else if (trainingData.asignacion?.tipo === "area") {
            // Notificar a usuarios en las áreas seleccionadas
            const areas = trainingData.asignacion.valores || [];
            usersToNotify.push(
                ...allUsers.filter(user => areas.includes(user.area))
            );
        } else if (trainingData.asignacion?.tipo === "usuarios") {
            // Notificar a usuarios específicos por nómina
            const nominas = trainingData.asignacion.valores || [];
            usersToNotify.push(
                ...allUsers.filter(user =>
                    nominas.includes(String(user.nomina))
                )
            );
        }

        // Crear notificaciones para cada usuario con identificador único de capacitación
        for (const user of usersToNotify) {
            if (user.uid) {
                await createNotification({
                    IdUsuario: user.uid,
                    Titulo: "📚 Nueva Capacitación",
                    Mensaje: `Se ha asignado una nueva capacitación: ${trainingData.titulo}`,
                    Destino: "training",
                    Accion: "nueva_capacitacion",
                    extra: {
                        capacitacionId: trainingRef.id,
                        capacitacionTitulo: trainingData.titulo
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error creando notificaciones para capacitación:", error);
        // No lanzamos el error para que la capacitación se haya creado aunque falle la notificación
    }
}

// Actualizar
export const updateTraining = async (id, data) => {
    const ref = doc(db, "capacitaciones", id);
    await updateDoc(ref, data);
}

// Borrar
export const deleteTraining = async (id) => {
    const ref = doc(db, "capacitaciones", id);
    await deleteDoc(ref);
}
