// src/services/medicamentosService.js

import { db } from '../config/firebase'
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    query,
    orderBy,
    Timestamp
} from 'firebase/firestore'

const COLLECTION = 'inventario_medicamentos'

//  GET
export const getMedicamentos = async () => {
    const q = query(collection(db, COLLECTION), orderBy('fechaCaducidad'))

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }))
}

export const createMedicamento = async (data) => {
    return await addDoc(collection(db, COLLECTION), {
        ...data,

        // 🔥 normalización de fechas
        fechaCaducidad: Timestamp.fromDate(new Date(data.fechaCaducidad)),
        fechaIngreso: Timestamp.fromDate(new Date(data.fechaIngreso)),

        estado: 'activo',

        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    })
}

// UPDATE
export const updateMedicamento = async (id, data) => {
    const ref = doc(db, COLLECTION, id)

    return await updateDoc(ref, {
        ...data,

        fechaCaducidad: Timestamp.fromDate(new Date(data.fechaCaducidad)),
        fechaIngreso: Timestamp.fromDate(new Date(data.fechaIngreso)),

        updatedAt: Timestamp.now()
    })
}

//  TOGGLE (soft delete)
export const toggleMedicamento = async (id, estado) => {
    const ref = doc(db, COLLECTION, id)

    return await updateDoc(ref, {
        estado,
        updatedAt: Timestamp.now()
    })
}