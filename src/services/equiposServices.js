// Import Firebase
import { db } from "../config/firebase";
import { getFirestore, doc, getDoc, query, collection, where, getDocs, addDoc, updateDoc, orderBy } from "firebase/firestore";
import { readSessionCache, writeSessionCache, readMemoryCache, writeMemoryCache } from "../utils/cacheStore";

const collectionName = "equipos";
const CACHE_KEY = "sii-aqua-equipos-cache";

// Obtener datos!
export const getEquipos = async ({ estado = null, tipo = null } = {}) => {
    const cacheKey = `${CACHE_KEY}:${estado === null ? "all" : String(estado)}:${tipo || "all"}`;
    const cached = readMemoryCache(cacheKey) ?? readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const constraints = [];
    if (estado !== null && estado !== undefined) {
        constraints.push(where("estado", "==", estado));
    }
    if (tipo) {
        constraints.push(where("tipo", "==", tipo));
    }
    constraints.push(orderBy("codigo", "asc"));

    const q = query(collection(db, collectionName), ...constraints);
    const snap = await getDocs(q);
    const equipos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    writeMemoryCache(cacheKey, equipos);
    writeSessionCache(cacheKey, equipos);
    return equipos;
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
