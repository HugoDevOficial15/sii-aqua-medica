import { db } from "../config/firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { actualizarColorStockPorItem } from "./rackStockService";

const ref = collection(db, "material_acondicionamiento");

export const crearAcondicionamiento = async (data) => {
    return await addDoc(ref, data);
};

export const obtenerAcondicionamiento = async () => {
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const actualizarAcondicionamiento = async (id, data) => {
    const result = await updateDoc(doc(db, "material_acondicionamiento", id), data);

    if (id && (typeof data?.color !== "undefined" || typeof data?.color2 !== "undefined")) {
        await actualizarColorStockPorItem(id, data.color ?? data.color2 ?? null);
    }

    return result;
};