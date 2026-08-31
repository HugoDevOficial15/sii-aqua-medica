import { db } from "../config/firebase";
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { actualizarColorStockPorItem } from "./rackStockService";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const ref = collection(db, "material_acondicionamiento");
const CACHE_KEY = "sii-aqua-acondicionamiento-cache";

export const crearAcondicionamiento = async (data) => {
    const result = await addDoc(ref, data);
    clearCachedData(CACHE_KEY);
    return result;
};

export const obtenerAcondicionamiento = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const snap = await getDocs(ref);
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    writeCachedData(CACHE_KEY, items);
    return items;
};

export const actualizarAcondicionamiento = async (id, data) => {
    const result = await updateDoc(doc(db, "material_acondicionamiento", id), data);

    if (id && (typeof data?.color !== "undefined" || typeof data?.color2 !== "undefined")) {
        await actualizarColorStockPorItem(id, data.color ?? data.color2 ?? null);
    }

    clearCachedData(CACHE_KEY);
    return result;
};