import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    deleteDoc,
    doc
} from "firebase/firestore";
import { db } from "../config/firebase";

const notasRef = collection(db, "notas");

// CREAR
export const createNota = async (data) => {
    return await addDoc(notasRef, data);
};

// OBTENER (FIX REAL)
export const obtenerNotasPorUsuario = async (usuarioId) => {

    const q = query(
        notasRef,
        where("id", "==", usuarioId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => {
        const data = d.data();

        return {
            docId: d.id,   // 🔥 ID REAL FIRESTORE
            ...data        // 🔥 tu id se mantiene
        };
    });
};

// UPDATE
export const updateNota = async (docId, data) => {
    const ref = doc(db, "notas", docId);
    return await updateDoc(ref, {
        ...data,
        updatedAt: new Date()
    });
};

// DELETE
export const deleteNota = async (docId) => {
    const ref = doc(db, "notas", docId);
    return await deleteDoc(ref);
};