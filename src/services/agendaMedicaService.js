import { collection, getDocs, Timestamp, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export const getAgendasMedicas = async () => {
    const snap = await getDocs(collection(db, "agendas_medicas"));

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const crearAgenda = async (data) => {
    const docRef = await addDoc(collection(db, "agendas_medicas"), {
        ...data,
        estado: "activa",
        createdAt: Timestamp.now()
    });

    return docRef.id;
};


// cambiar estado
export const toggleAgendaEstado = async (id, estadoActual) => {
    await updateDoc(doc(db, "agendas_medicas", id), {
        estado: estadoActual === "activa" ? "inactiva" : "activa"
    });
};