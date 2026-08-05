import { db } from "../config/firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { actualizarColorStockPorItem } from "./rackStockService";

const ref = collection(db, "producto_terminado");

export const crearProducto = async (data) => {
    return await addDoc(ref, data);
};

export const obtenerProducto = async () => {
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const actualizarProducto = async (id, data) => {
    const result = await updateDoc(doc(db, "producto_terminado", id), data);

    if (typeof data?.color2 !== "undefined" && id) {
        await actualizarColorStockPorItem(id, data.color2 ?? null);
    }

    return result;
};