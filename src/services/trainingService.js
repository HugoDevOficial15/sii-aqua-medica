import { db } from "../config/firebase";
import { query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";

const trainingCollection = collection(db, "capacitaciones");

// Obtener capacitaciones
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

// Crear
export const createTraining = async (trainingData) => {
    await addDoc(trainingCollection, trainingData);
}

// Actualizar
export const updateTraining = async (id, data) => {
    const ref = doc(db, "capacitaciones", id);
    await updateDoc(ref, data);
}
