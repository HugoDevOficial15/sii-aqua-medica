import {
    collection,
    getDocs,
    query,
    where, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const CACHE_KEY = "sii-aqua-servicios-programados-cache";

export const getServiciosProgramadosByMes = async (anio, mes) => {
    const cacheKey = `${CACHE_KEY}:${anio}:${mes}`;
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    try {

        const q = query(
            collection(db, "servicios_programados"),
            where("anio", "==", anio),
            where("mes", "==", mes)
        );

        const snapshot = await getDocs(q);
        const servicios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        writeCachedData(cacheKey, servicios);
        return servicios;

    } catch (error) {
        console.error("Error servicios_programados:", error);
        return [];
    }
};

export const eliminarServicio = async (id) => {

    await deleteDoc(
        doc(db, "servicios_programados", id)
    );
    clearCachedData(CACHE_KEY);

};