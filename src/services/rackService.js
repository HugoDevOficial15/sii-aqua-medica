import { db } from "../config/firebase";

import {
    collection,
    addDoc,
    doc,
    updateDoc,
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

const lockRackFunction =
    httpsCallable(
        functions,
        "lockRack"
    );

export const crearRack = async (data) => {

    return await addDoc(ref, {
        ...data,
        createdAt: serverTimestamp()
    });

};

export const actualizarRack = async (id, data) => {

    const rackRef = doc(db, "racks", id);

    return await updateDoc(rackRef, data);

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

        const racks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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

    const snap = await getDocs(ref);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

};