import { db } from "../config/firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { actualizarColorStockPorItem } from "./rackStockService";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const ref = collection(db, "producto_terminado");
const CACHE_KEY = "sii-aqua-productos-cache";

export const crearProducto = async (data) => {
    const result = await addDoc(ref, data);
    clearCachedData(CACHE_KEY);
    return result;
};

export const obtenerProducto = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const snap = await getDocs(ref);
    const productos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    writeCachedData(CACHE_KEY, productos);
    return productos;
};

export const actualizarProducto = async (id, data) => {
    const result = await updateDoc(doc(db, "producto_terminado", id), data);

    if (typeof data?.color2 !== "undefined" && id) {
        await actualizarColorStockPorItem(id, data.color2 ?? null);
    }

    clearCachedData(CACHE_KEY);
    return result;
};