import { db } from "../config/firebase";

import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { actualizarColorStockPorItem } from "./rackStockService";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const ref = collection(db, "materia_prima");
const CACHE_KEY = "sii-aqua-materia-prima-cache";

export const crearMateriaPrima = async (data) => {
    const result = await addDoc(ref, data);
    clearCachedData(CACHE_KEY);
    return result;
};

export const obtenerMateriaPrima = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const snap = await getDocs(ref);
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    writeCachedData(CACHE_KEY, items);
    return items;
};

export const actualizarMateriaPrima = async (id, data) => {
    const result = await updateDoc(doc(db, "materia_prima", id), data);

    if (typeof data?.color !== "undefined" && id) {
        await actualizarColorStockPorItem(id, data.color ?? null);
    }

    clearCachedData(CACHE_KEY);
    return result;
};