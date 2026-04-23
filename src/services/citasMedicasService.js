import {
    collection,
    getDocs,
    doc,
    updateDoc, query, where
} from "firebase/firestore";
import { db } from "../config/firebase";

export const getCitasMedicas = async () => {
    const snap = await getDocs(collection(db, "citas_medicas"));

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const atenderCita = async (id, observacion) => {
    await updateDoc(doc(db, "citas_medicas", id), {
        estado: "atendido",
        observacion
    });
};

export const cancelarCita = async (id) => {
    await updateDoc(doc(db, "citas_medicas", id), {
        estado: "libre",
        usuarioId: null,
        usuarioNombre: null
    });
};


export const getCitasPorAgenda = async (agendaId) => {

    const q = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};