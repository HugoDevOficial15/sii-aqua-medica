import { collection, getDocs, Timestamp, updateDoc, doc, addDoc, writeBatch, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { queueCancelacionCitasPorAgenda } from "./citasMedicasService";
import { createNotification } from "../utils/createNotification";
import { readSessionCache, writeSessionCache, clearCachedData } from "../utils/cacheStore";

const CACHE_KEY = "sii-aqua-agendas-medicas-cache";

export const getAgendasMedicas = async ({ estado = null } = {}) => {
    const cacheKey = estado === null ? CACHE_KEY : `${CACHE_KEY}:${String(estado)}`;
    const cached = readSessionCache(cacheKey);
    if (cached) {
        return cached;
    }

    const constraints = [];
    if (estado !== null && estado !== undefined) {
        constraints.push(where("estado", "==", estado));
    }

    const q = query(collection(db, "agendas_medicas"), ...constraints);
    const snap = await getDocs(q);
    const agendas = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    writeSessionCache(cacheKey, agendas);
    return agendas;
};

export const crearAgenda = async (data) => {
    const docRef = await addDoc(collection(db, "agendas_medicas"), {
        ...data,
        estado: "activa",
        createdAt: Timestamp.now()
    });
    clearCachedData(CACHE_KEY);

    // Crear notificación para usuarios activos
    try {
        const activeUsersQuery = query(
            collection(db, "usuarios"),
            where("activo", "==", true)
        );
        const usersSnapshot = await getDocs(activeUsersQuery);

        const notificacionesPromises = usersSnapshot.docs.map(userDoc => {
            const userId = userDoc.id;
            return createNotification({
                IdUsuario: userId,
                Titulo: "📅 Nueva agenda médica",
                Mensaje: `Se creó la campaña: "${data.nombre}". Revisa los horarios disponibles.`,
                Destino: "citas-medicas",
                extra: {
                    NomAgenda: data.nombre,
                    agendaId: docRef.id
                }
            }).catch(error => {
                console.error(`Error creando notificación para usuario ${userId}:`, error);
            });
        });

        await Promise.all(notificacionesPromises);
    } catch (err) {
        console.error("No se pudo crear las notificaciones de nueva agenda:", err);
        // No impedimos que la agenda se cree si las notificaciones fallan
    }

    return docRef.id;
};


// cambiar estado
export const toggleAgendaEstado = async (id, estadoActual) => {
    await updateDoc(doc(db, "agendas_medicas", id), {
        estado: estadoActual === "activa" ? "inactiva" : "activa"
    });
    clearCachedData(CACHE_KEY);
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
    clearCachedData(CACHE_KEY);

    return { success: true, citasCanceladas };

};