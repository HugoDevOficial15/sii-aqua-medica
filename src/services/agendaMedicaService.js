import { collection, getDocs, Timestamp, updateDoc, doc, addDoc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { queueCancelacionCitasPorAgenda } from "./citasMedicasService";

export const getAgendasMedicas = async () => {
    const snap = await getDocs(collection(db, "agendas_medicas"));

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const crearAgenda = async (data) => {
    const docRef = await addDoc(collection(db, "agendas_medicas"), {
        ...data,
        estado: "activa",
        createdAt: Timestamp.now()
    });

    return docRef.id;
};


// cambiar estado
export const toggleAgendaEstado = async (id, estadoActual) => {
    await updateDoc(doc(db, "agendas_medicas", id), {
        estado: estadoActual === "activa" ? "inactiva" : "activa"
    });
};

// ======================================================
// EDICIÓN/CANCELACIÓN CON IMPACTO EN CITAS (Administrador)
// ======================================================
// Se usa cuando el admin modifica fechaInicio/fechaFin o desactiva la
// agenda: actualiza la agenda y cancela en cascada sus citas activas +
// notifica a los usuarios afectados, todo en una sola operación atómica
// (writeBatch), nunca updateDoc's independientes. Reutiliza
// queueCancelacionCitasPorAgenda() de citasMedicasService.js para no
// duplicar la lógica de cancelación con cancelAppointmentsByAgenda().
export const updateAgendaWithBatch = async (agendaId, agendaUpdates, motivo, adminUid) => {

    const batch = writeBatch(db);

    batch.update(doc(db, "agendas_medicas", agendaId), agendaUpdates);

    const citasCanceladas = await queueCancelacionCitasPorAgenda(batch, agendaId, motivo, adminUid);

    await batch.commit();

    return { success: true, citasCanceladas };

};