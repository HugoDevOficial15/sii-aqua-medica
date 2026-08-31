import { db } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    query,
    where,
    onSnapshot,
    getDocs
} from "firebase/firestore";

import {
    httpsCallable
} from "firebase/functions";

import {
    functions
} from "../config/firebase";

const ref = collection(db, "racks");
const RACKS_CACHE_KEY = "sii-aqua-racks-cache";

const normalizeRackList = (racks = []) => {
    return [...(racks || [])].sort((a, b) => {
        const rackA = Number(a?.numeroRack || 0);
        const rackB = Number(b?.numeroRack || 0);
        if (rackA !== rackB) return rackA - rackB;
        return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
};

const lockRackFunction =
    httpsCallable(
        functions,
        "lockRack"
    );

export const crearRack = async (data) => {
    const result = await addDoc(ref, {
        ...data,
        createdAt: serverTimestamp()
    });

    clearCachedData(RACKS_CACHE_KEY);
    return result;
};

export const actualizarRack = async (id, data) => {
    const rackRef = doc(db, "racks", id);
    const result = await updateDoc(rackRef, data);

    clearCachedData(RACKS_CACHE_KEY);
    return result;
};

export const eliminarRack = async (id) => {
    const rackRef = doc(db, "racks", id);
    const result = await deleteDoc(rackRef);

    clearCachedData(RACKS_CACHE_KEY);
    return result;
};

/*
|--------------------------------------------------------------------------
| SNAPSHOT RACKS
|--------------------------------------------------------------------------
*/

export const suscribirRacks = (callback) => {

    const q = query(
        ref,
        orderBy("numeroRack")
    );

    return onSnapshot(q, (snapshot) => {

        const racks = normalizeRackList(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })));

        writeCachedData(RACKS_CACHE_KEY, racks);
        callback(racks);

    });

};

/*
|--------------------------------------------------------------------------
| Snapshot movimientos
|--------------------------------------------------------------------------
*/

export const suscribirMovimientos = (

    rackId,

    callback

) => {

    const q = query(

        collection(db, "movimientos"),

        where("rackId", "==", rackId),

        orderBy("createdAt", "desc")

    );

    return onSnapshot(q, (snapshot) => {

        const movimientos = snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data()

        }));

        callback(movimientos);

    });

};

/*
|--------------------------------------------------------------------------
| BLOQUEAR RACK
|--------------------------------------------------------------------------
*/

export const bloquearRack = async (

    rackId,

    usuario

) => {

    const result = await lockRackFunction({

        action: "lock",

        rackId,

        user: {

            id: usuario.id,

            nombre: usuario.nombre

        }

    });

    return result.data;

};

/*
|--------------------------------------------------------------------------
| LIBERAR RACK
|--------------------------------------------------------------------------
*/

export const liberarRack = async (

    rackId

) => {

    const result = await lockRackFunction({

        action: "unlock",

        rackId

    });

    return result.data;

};

export const obtenerRacks = async () => {
    const cached = readCachedData(RACKS_CACHE_KEY);
    if (cached) {
        return cached;
    }

    const snap = await getDocs(ref);
    const racks = normalizeRackList(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })));

    writeCachedData(RACKS_CACHE_KEY, racks);
    return racks;
};