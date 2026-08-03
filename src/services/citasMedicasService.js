import {
    collection,
    getDocs,
    doc,
    addDoc,
    updateDoc, query, where,
    writeBatch,
    serverTimestamp,
    orderBy
} from "firebase/firestore";
import { db } from "../config/firebase";
import { CITA_ESTADOS, ESTADOS_CANCELABLES } from "../constants/citasMedicasStates";

export const getCitasMedicas = async () => {
    const snap = await getDocs(collection(db, "citas_medicas"));

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const atenderCita = async (id, observacion) => {
    await updateDoc(doc(db, "citas_medicas", id), {
        estado: "atendido",
        observacion
    });
};

export const cancelarCita = async (id) => {
    await updateDoc(doc(db, "citas_medicas", id), {
        estado: "libre",
        usuarioId: null,
        usuarioNombre: null
    });
};


export const getCitasPorAgenda = async (agendaId) => {

    const q = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// ======================================================
// "MIS CITAS AGENDADAS" (Operador)
// ======================================================
// Se busca por nómina (no por uid/userId): es el identificador estable
// usado en el resto del proyecto para localizar a un usuario.
export const getUserAppointments = async (nomina) => {
    try {
        // 1. Consulta SIMPLE: Solo pedimos las citas de esta nómina (No requiere índice)
        const q = query(
            collection(db, "citas_medicas"),
            where("nominaUsuario", "==", nomina)
        );
        
        const snapshot = await getDocs(q);

        // 2. Extraemos los datos
        let misCitas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 3. Filtramos y ordenamos localmente con JavaScript puro
        misCitas = misCitas
            // Dejamos solo las citas activas
            .filter(cita => cita.estado === "activa") 
            // Las ordenamos de la más próxima a la más lejana
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        return misCitas;
    } catch (error) {
        console.error("Error al obtener las citas del usuario:", error);
        throw error;
    }
};

// ======================================================
// CANCELAR CITA (Operador) — su propia cita únicamente
// ======================================================
// Nunca elimina el documento: lo marca como cancelada y conserva el
// historial completo (motivo, fecha, quién canceló). "nominaCancelada" es
// la clave que usa getAvailableSchedules() para aplicar la restricción de
// "no puedes volver a ver/reservar el horario que tú mismo cancelaste".
export const cancelAppointmentByUser = async (citaId, user, motivo) => {

    await updateDoc(doc(db, "citas_medicas", citaId), {
        estado: CITA_ESTADOS.CANCELADA_USUARIO,
        motivoCancelacion: motivo,
        fechaCancelacion: serverTimestamp(),
        canceladaPor: user?.uid || user?.id || null,
        nominaCancelada: user?.nomina || null
    });

    // Confirmación para el propio usuario de que su cancelación se registró.
    if (user?.id) {
        await addDoc(collection(db, "notificaciones"), {
            Titulo: "Cita cancelada",
            Mensaje: "Tu cancelación fue registrada correctamente.",
            Destino: "CitaCanceladaConfirmacion",
            IdUsuario: user.id,
            fechaCreacion: serverTimestamp()
        });
    }

};

// ======================================================
// CANCELACIÓN MASIVA POR AGENDA (Administrador)
// ======================================================
// Agrega al batch recibido la cancelación de todas las citas cancelables
// de una agenda + una notificación por cada usuario afectado. No hace
// commit: lo hace el llamador, para poder combinarlo con otras
// operaciones (ej. actualizar la propia agenda) en una sola operación
// atómica. Así cancelAppointmentsByAgenda() y updateAgendaWithBatch()
// (en agendaMedicaService.js) reutilizan exactamente la misma lógica.
export const queueCancelacionCitasPorAgenda = async (batch, agendaId, motivo, adminUid) => {

    const q = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId),
        where("estado", "in", ESTADOS_CANCELABLES)
    );

    const snap = await getDocs(q);

    snap.docs.forEach(citaDoc => {

        const cita = citaDoc.data();

        batch.update(citaDoc.ref, {
            estado: CITA_ESTADOS.CANCELADA_ADMIN,
            motivoCancelacion: motivo,
            fechaCancelacion: serverTimestamp(),
            canceladaPor: adminUid,
            agendaModificada: true
        });

        const idUsuario = cita.userId || cita.usuarioId;

        if (idUsuario) {
            const notifRef = doc(collection(db, "notificaciones"));
            batch.set(notifRef, {
                Titulo: "Cita cancelada",
                Mensaje: `La agenda médica fue modificada por el administrador. Tu cita ha sido cancelada.\n\nMotivo:\n${motivo}\n\nPor favor agenda una nueva cita.`,
                Destino: "CitaCancelada",
                IdUsuario: idUsuario,
                fechaCreacion: serverTimestamp()
            });
        }

    });

    return snap.docs.length;

};

export const cancelAppointmentsByAgenda = async (agendaId, motivo, adminUid) => {

    const batch = writeBatch(db);

    const citasCanceladas = await queueCancelacionCitasPorAgenda(batch, agendaId, motivo, adminUid);

    await batch.commit();

    return { success: true, citasCanceladas };

};

// ======================================================
// DISPONIBILIDAD (Operador) — con restricción por nómina
// ======================================================
// Un horario cancelado por un usuario vuelve a estar libre para
// cualquier OTRO usuario, pero permanece oculto específicamente para la
// nómina que lo canceló (no aparece en la lista, no se puede reservar).
export const getAvailableSchedules = async ({ agendaId, fecha, bloquesPosibles, nominaUsuarioActual }) => {

    const q = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId),
        where("fecha", "==", fecha)
    );

    const snap = await getDocs(q);

    const horasOcupadas = new Set();
    const horasOcultasParaNomina = new Set();

    snap.docs.forEach(d => {

        const cita = d.data();
        const hora = cita.horaInicio || cita.hora;

        if (!hora) return;

        if (cita.estado === CITA_ESTADOS.CANCELADA_USUARIO) {
            if (String(cita.nominaCancelada) === String(nominaUsuarioActual)) {
                horasOcultasParaNomina.add(hora);
            }
            return;
        }

        if (cita.estado === CITA_ESTADOS.CANCELADA_ADMIN) {
            return;
        }

        horasOcupadas.add(hora);

    });

    return {
        bloques: bloquesPosibles.filter(h => !horasOcultasParaNomina.has(h)),
        ocupadas: Array.from(horasOcupadas)
    };

};;