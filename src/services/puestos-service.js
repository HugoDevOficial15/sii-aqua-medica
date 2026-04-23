import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";


import { db } from "../config/firebase";

const ref = collection(db, "puestos");

// Obtener datos.
export const getPuestos = async () => {

    const snap = await getDocs(ref);

    return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    }));

}

// Crear
export const createPuesto = async (data) => {
    return await addDoc(ref, {
        nombre: data.nombre,
        activo: true,
        createdAt: new Date(),
    });
}

// editar
export const updatePuesto = async (id, data) => {

    const ref = doc(db, "puestos", id)

    return await updateDoc(ref, data);
}