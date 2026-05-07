import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from "firebase/firestore";

import { db } from "../config/firebase";


// 🔥 OBTENER LOGS
export const getLogsEquipo = async (equipoId) => {

    const ref = collection(db, "equipos", equipoId, "logs");

    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};


// 🔥 CREAR LOG
export const createLogEquipo = async (
    equipoId,
    payload
) => {

    const ref = collection(db, "equipos", equipoId, "logs");

    return await addDoc(ref, {
        ...payload,
        createdAt: serverTimestamp()
    });
};