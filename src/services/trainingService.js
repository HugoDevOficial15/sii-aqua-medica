import { db } from "../config/firebase";
import { query, where, writeBatch, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

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

    // Crear notificaciones para usuarios asignados usando consultas filtradas y no la colección entera.
    try {
        const asignacion = trainingData?.asignacion || { tipo: "global", valores: [] };
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
        const usersToNotify = usersSnapshot.docs
            .map(doc => ({
                id: doc.id,
                uid: doc.data().uid,
                nomina: doc.data().nomina,
                area: doc.data().area,
                ...doc.data()
            }))
            .filter(user => user.uid);

        if (usersToNotify.length > 0) {
            const batch = writeBatch(db);
            const notifCollection = collection(db, "notificaciones");

            for (const user of usersToNotify) {
                const notifRef = doc(notifCollection);
                batch.set(notifRef, {
                    IdUsuario: user.uid,
                    Titulo: "📚 Nueva Capacitación",
                    Mensaje: `Se ha asignado una nueva capacitación: ${trainingData.titulo}`,
                    Destino: "training",
                    Accion: "nueva_capacitacion",
                    capacitacionId: trainingRef.id,
                    capacitacionTitulo: trainingData.titulo,
                    enviado: false,
                    fechaCreacion: serverTimestamp(),
                    fechaEnviado: null
                });
            }

            await batch.commit();
        }
    } catch (error) {
        console.error("Error creando notificaciones para capacitación:", error);
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
