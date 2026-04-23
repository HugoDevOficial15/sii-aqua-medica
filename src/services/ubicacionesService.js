import { db } from "../config/firebase";

import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

const ref = collection(db, "ubicaciones");

// Crear relación
export const asignarUbicacion = async (data) => {
    return await addDoc(ref, {
        ...data,
        createdAt: new Date()
    });
};

// Obtener ubicaciones por item
export const obtenerUbicacionesPorItem = async (itemId) => {
    const q = query(ref, where("itemId", "==", itemId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};