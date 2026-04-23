import { db } from "../config/firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";

const ref = collection(db, "racks");

export const crearRack = async (data) => {
    return await addDoc(ref, {
        ...data,
        createdAt: new Date()
    });
};

export const obtenerRacks = async () => {
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const actualizarRack = async (id, data) => {
    const ref = doc(db, "racks", id);
    return await updateDoc(ref, data);
};

//  BLOQUEAR RACK
export const bloquearRack = async (rackId, userId) => {

    const ref = doc(db, "racks", rackId);

    await updateDoc(ref, {
        bloqueado: true,
        bloqueadoPor: userId,
        updatedAt: new Date()
    });
};

// LIBERAR RACK
export const liberarRack = async (rackId) => {

    const ref = doc(db, "racks", rackId);

    await updateDoc(ref, {
        bloqueado: false,
        bloqueadoPor: null,
        updatedAt: new Date()
    });
};