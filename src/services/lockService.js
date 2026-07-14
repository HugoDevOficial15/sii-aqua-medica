import {

    collection,
    doc,

    setDoc,
    deleteDoc,

    serverTimestamp,

    onSnapshot

} from "firebase/firestore";

import { db } from "../config/firebase";

const COLLECTION = "locks";

/*
|--------------------------------------------------------------------------
| Bloquear
|--------------------------------------------------------------------------
*/

export const bloquearRack = async (

    rack,

    usuario

) => {

    await setDoc(

        doc(db, COLLECTION, rack.id),

        {

            rackId: rack.id,

            rackNumero: rack.numeroRack,

            usuario: {

                id: usuario.id,

                nombre: usuario.nombre

            },

            createdAt: serverTimestamp()

        }

    );

};

/*
|--------------------------------------------------------------------------
| Liberar
|--------------------------------------------------------------------------
*/

export const liberarRack = async (

    rackId

) => {

    await deleteDoc(

        doc(db, COLLECTION, rackId)

    );

};

/*
|--------------------------------------------------------------------------
| Snapshot Locks
|--------------------------------------------------------------------------
*/

export const suscribirLocks = (

    callback

) => {

    return onSnapshot(

        collection(db, COLLECTION),

        snapshot => {

            const locks = {};

            snapshot.forEach(doc => {

                locks[doc.id] = doc.data();

            });

            callback(locks);

        }

    );

};