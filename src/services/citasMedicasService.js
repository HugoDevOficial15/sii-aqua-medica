import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc, query, where,
    writeBatch,
    serverTimestamp,
    orderBy
} from "firebase/firestore";
import { db } from "../config/firebase";
import { CITA_ESTADOS, ESTADOS_CANCELABLES } from "../constants/citasMedicasStates";
import { createNotification } from "../utils/createNotification";

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

        // Enriquecer cada cita con el nombre de la agenda (si está disponible)
        // para que desde la vista de usuario podamos mostrar la campaña/agenda.
        for (let i = 0; i < misCitas.length; i++) {
            const cita = misCitas[i];
            try {
                if (cita.agendaId) {
                    const agendaRef = doc(db, "agendas_medicas", cita.agendaId);
                    const agendaSnap = await getDoc(agendaRef);
                    misCitas[i] = {
                        ...cita,
                        agendaNombre: agendaSnap.exists() ? agendaSnap.data().nombre : null
                    };
                } else {
                    misCitas[i] = { ...cita, agendaNombre: null };
                }
            } catch (error) {
                misCitas[i] = { ...cita, agendaNombre: null };
            }
        }

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
        canceladaPor: user?.uid || null,
        nominaCancelada: user?.nomina || null
    });

    // Confirmación para el propio usuario de que su cancelación se registró.
    if (user?.uid) {
        await createNotification({
            IdUsuario: user.uid,
            Titulo: "Cita cancelada",
            Mensaje: "Tu cancelación fue registrada correctamente.",
            Destino: "CitaCanceladaConfirmacion"
        });
    }

};

// ======================================================
// CANCELACIÓN MASIVA POR AGENDA (Administrador)
// ======================================================
// Agrega al batch recibido la cancelación de todas las citas cancelables
// de una agenda. Retorna los datos de las citas para crear notificaciones
// después (fuera del batch).
export const queueCancelacionCitasPorAgenda = async (batch, agendaId, motivo, adminUid) => {

    const q = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId),
        where("estado", "in", ESTADOS_CANCELABLES)
    );

    const snap = await getDocs(q);

    const citasACancelar = [];

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
            citasACancelar.push({
                idUsuario,
                motivo
            });
        }

    });

    return { count: snap.docs.length, citasACancelar };

};

export const cancelAppointmentsByAgenda = async (agendaId, motivo, adminUid) => {

    const batch = writeBatch(db);

    const { count, citasACancelar } = await queueCancelacionCitasPorAgenda(batch, agendaId, motivo, adminUid);

    await batch.commit();

    // Crear notificaciones después del batch (con push notifications automáticas)
    for (const cita of citasACancelar) {
        try {
            await createNotification({
                IdUsuario: cita.idUsuario,
                Titulo: "Cita cancelada",
                Mensaje: `La agenda médica fue modificada por el administrador. Tu cita ha sido cancelada.\n\nMotivo:\n${cita.motivo}\n\nPor favor agenda una nueva cita.`,
                Destino: "CitaCancelada"
            });
        } catch (error) {
            console.error(`Error creando notificación para usuario ${cita.idUsuario}:`, error);
        }
    }

    return { success: true, citasCanceladas: count };

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

};

// ======================================================
// AGENDAR CITA (Operador)
// ======================================================
// Valida dos reglas:
// 1. Aislamiento de campaña: un usuario NO puede tener dos citas en la
//    misma agenda (campaña).
// 2. Bloqueo de horario: un usuario NO puede tener dos citas a la misma
//    hora y fecha (en distintas agendas, sí es posible si las horas no
//    coinciden).
// Si ambas validaciones pasan, crea la cita.
export const bookAppointment = async (appointmentData) => {

    const {
        agendaId,
        fecha,
        horaInicio,
        userId,
        nominaUsuario,
        usuario,
        nombre,
        paciente
    } = appointmentData;

    if (!agendaId || !fecha || !horaInicio || !userId) {
        throw new Error("Datos incompletos para agendar la cita.");
    }

    // ======================================================
    // 1. AISLAMIENTO DE CAMPAÑA
    // ======================================================
    // Verifica si el usuario ya tiene una cita en esta agenda específica.
    const qCampana = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId),
        where("userId", "==", userId)
    );

    const snapCampana = await getDocs(qCampana);

    if (!snapCampana.empty) {
        throw new Error("Ya tienes un turno asignado en esta campaña.");
    }

    // ======================================================
    // 2. BLOQUEO DE HORARIO
    // ======================================================
    // Verifica si el usuario ya tiene una cita en la misma fecha y hora
    // (sin importar la agenda/campaña).
    const qHorario = query(
        collection(db, "citas_medicas"),
        where("userId", "==", userId),
        where("fecha", "==", fecha)
    );

    const snapHorario = await getDocs(qHorario);

    snapHorario.docs.forEach(doc => {
        const cita = doc.data();
        const horaExistente = cita.horaInicio || cita.hora || "";

        if (horaExistente === horaInicio) {
            throw new Error("Ya tienes otra cita agendada a esta misma hora.");
        }
    });

    // ======================================================
    // SI PASA AMBAS VALIDACIONES, CREA LA CITA
    // ======================================================
    const nuevaCita = {
        agendaId,
        fecha,

        horaInicio,
        hora: horaInicio,
        horario: horaInicio,
        time: horaInicio,

        userId,
        nominaUsuario: nominaUsuario || null,

        usuario: usuario || nombre || paciente || null,
        paciente: paciente || usuario || nombre || null,
        nombre: nombre || usuario || paciente || null,

        estado: CITA_ESTADOS.ACTIVA,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "citas_medicas"), nuevaCita);

    return {
        id: docRef.id,
        ...nuevaCita
    };

};;