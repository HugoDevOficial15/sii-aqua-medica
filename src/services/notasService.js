import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    deleteDoc,
    doc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { readSessionCache, writeSessionCache, clearCachedData } from "../utils/cacheStore";

const notasRef = collection(db, "notas");
const CACHE_KEY = "sii-aqua-notas-cache";

// CREAR
export const createNota = async (data) => {
    const result = await addDoc(notasRef, data);
    clearCachedData(`${CACHE_KEY}:${String(data?.id || "anon")}`);
    return result;
};

// OBTENER (FIX REAL)
export const obtenerNotasPorUsuario = async (usuarioId) => {
    const cacheKey = `${CACHE_KEY}:${String(usuarioId || "anon")}`;
    const cached = readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const q = query(
        notasRef,
        where("id", "==", usuarioId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const notas = snapshot.docs.map(d => {
        const data = d.data();

        return {
            docId: d.id,
            ...data
        };
    });

    writeSessionCache(cacheKey, notas);
    return notas;
};

// UPDATE
export const updateNota = async (docId, data) => {
    const ref = doc(db, "notas", docId);
    const result = await updateDoc(ref, {
        ...data,
        updatedAt: new Date()
    });
    clearCachedData(CACHE_KEY);
    return result;
};

// DELETE
export const deleteNota = async (docId) => {
    const ref = doc(db, "notas", docId);
    const result = await deleteDoc(ref);
    clearCachedData(CACHE_KEY);
    return result;
};