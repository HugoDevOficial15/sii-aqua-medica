// Import Firebase
import { db } from "../config/firebase";
import { getFirestore, doc, getDoc, query, collection, where, getDocs, addDoc, updateDoc } from "firebase/firestore";

const collectionName = "equipos";

// Obtener datos!
export const getEquipos = async () => {

    const snap = await getDocs(collection(db, collectionName));

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

}

// Crear uno
export const createEquipo = async (data) => {

    return await addDoc(collection(db, collectionName), {
        ...data,
        estado: true,
        createdAt: new Date()
    });

}

// Actualizar Equipo
export const updateEquipo = async (id, data) => {

    const ref = doc(db, collectionName, id)
    return await updateDoc(ref, {
        ...data,
        updateAt: new Date()
    });

}

export const activarEquipo = async (id) => {
    const ref = doc(db, collectionName, id)
    return await updateDoc(ref, {
        estado: true
    })
}

// BAja equipo.
export const bajaEquipo = async (id) => {

    const ref = doc(db, collectionName, id);
    return await updateDoc(ref, {
        estado: false
    })


}
