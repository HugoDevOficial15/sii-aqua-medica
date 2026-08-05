import { db } from "../config/firebase";

import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { actualizarColorStockPorItem } from "./rackStockService";

const ref = collection(db, "materia_prima");

export const crearMateriaPrima = async (data) => {
    return await addDoc(ref, data);
};

export const obtenerMateriaPrima = async () => {
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const actualizarMateriaPrima = async (id, data) => {
    const result = await updateDoc(doc(db, "materia_prima", id), data);

    if (typeof data?.color !== "undefined" && id) {
        await actualizarColorStockPorItem(id, data.color ?? null);
    }

    return result;
};