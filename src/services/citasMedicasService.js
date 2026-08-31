import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { CITA_ESTADOS, ESTADOS_CANCELABLES } from "../constants/citasMedicasStates";
import { createNotification } from "../utils/createNotification";

const resolveUserDocIdByFirebaseUid = async (userId) => {
    if (!userId) return null;

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", userId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }
    } catch (error) {
        console.error("Error resolviendo docId del usuario para citas:", error);
    }

    return userId;
};

export const getCitasMedicas = async ({ agendaId = null, userId = null, estado = null } = {}) => {
    const constraints = [];

    if (agendaId) {
        constraints.push(where("agendaId", "==", agendaId));
    }
    if (userId) {
        constraints.push(where("userId", "==", userId));
    }
    if (estado) {
        constraints.push(where("estado", "==", estado));
    }

    const q = query(collection(db, "citas_medicas"), ...constraints);
    const snap = await getDocs(q);

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

// ======================================================
// CANCELAR CITA INDIVIDUAL POR ADMINISTRADOR
// ======================================================
// Cancela UNA cita específica solicitada por admin con motivo obligatorio.
// Si la cita tiene usuario asignado → notifica al usuario.
// Si la cita NO tiene usuario → no genera notificación.
export const cancelarCitaPorAdmin = async (citaId, motivo, adminUid, adminNombre) => {

    // 1. Obtener la cita actual para verificar si tiene usuario asignado
    const citaRef = doc(db, "citas_medicas", citaId);
    const citaSnap = await getDoc(citaRef);

    if (!citaSnap.exists()) {
        throw new Error("La cita no existe");
    }

    const cita = citaSnap.data();
    const tieneUsuario = !!(cita.userId || cita.usuarioId || cita.nominaUsuario);

    // 2. Actualizar la cita en Firebase
    // 🔥 IMPORTANTE: Solo guardar adminUid si existe, para evitar "undefined"
    const updateData = {
        estado: CITA_ESTADOS.CANCELADA_ADMIN,
        motivoCancelacion: motivo,
        fechaCancelacion: serverTimestamp(),
        agendaId: cita.agendaId // Preservar para reagendamiento
    };

    // Solo agregar campos opcionales si tienen valor
    if (adminUid) {
        updateData.canceladaPor = adminUid;
    }
    if (adminNombre) {
        updateData.nombreAdminCancelacion = adminNombre;
    }

    await updateDoc(citaRef, updateData);

    // 3. Si tiene usuario asignado → notificar SOLO a ese usuario
    if (tieneUsuario) {
        const idUsuario = cita.userId || cita.usuarioId;
        const nominaUsuario = cita.nominaUsuario;
        const nombreUsuario = cita.usuarioNombre || cita.usuario || cita.nombre;
        const fecha = cita.fecha;
        const hora = cita.horaInicio || cita.hora;
        const agendaNombre = cita.agendaNombre || "la campaña médica";
        const agendaId = cita.agendaId;

        try {
            await createNotification({
                IdUsuario: idUsuario,
                Titulo: "📅 Cita Cancelada por Administrador",
                Mensaje: `Tu cita del ${fecha} a las ${hora} en "${agendaNombre}" ha sido cancelada.\n\nMotivo: ${motivo}\n\nPuedes agendar un nuevo horario en la misma campaña.`,
                Destino: "medical-appointments",
                Accion: "cita_cancelada_admin",
                extra: {
                    citaId: citaId,
                    agendaId: agendaId,
                    motivo: motivo,
                    fecha: fecha,
                    hora: hora,
                    permitirReagendar: true,
                    // 🔥 LINK DIRECTO PARA REAGENDAR EN LA MISMA AGENDA
                    enlaceReagendar: `/citas-medicas?reagendar=${agendaId}`
                }
            });
        } catch (error) {
            console.error(`Error notificando al usuario ${idUsuario}:`, error);
            // No lanzar error: la cancelación ya se guardó
        }
    }
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
export const getUserAppointments = async (nomina, userId) => {
    try {
        if (!userId && !nomina) {
            throw new Error("Se requiere el ID de usuario o nómina para obtener citas");
        }

        let snapshot;

        // 🔥 CRÍTICO: Filtrar SIEMPRE por userId si disponible (es el identificador más confiable)
        // NO usar fallback a nomina porque causa que usuarios vean citas de otros con la misma nomina
        if (userId) {
            const q = query(
                collection(db, "citas_medicas"),
                where("userId", "==", userId)
            );
            snapshot = await getDocs(q);
        } else if (nomina) {
            // Solo si NO hay userId, usar nómina como último recurso
            const q = query(
                collection(db, "citas_medicas"),
                where("nominaUsuario", "==", nomina)
            );
            snapshot = await getDocs(q);
        } else {
            throw new Error("Se requiere userId o nomina para obtener citas");
        }

        // 2. Extraemos los datos
        let misCitas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 2b. Filtrado adicional ESTRICTO por usuario
        // 🔥 CRÍTICO: Si se usó userId en la query, EXIGIR que coincida EXACTAMENTE
        // Rechaza CUALQUIER cita que no tenga userId o que tenga userId diferente
        if (userId) {
            const paramUserId = String(userId).trim();

            misCitas = misCitas.filter(cita => {
                if (!cita.userId) {
                    return false;
                }

                const citaUserId = String(cita.userId).trim();
                return citaUserId === paramUserId;
            });
        } else {
            // Si se usó nomina, filtrar por nomina
            const paramNomina = String(nomina).trim();

            misCitas = misCitas.filter(cita => {
                const citaNomina = String(cita.nominaUsuario || "").trim();
                return citaNomina === paramNomina;
            });
        }

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
            .filter(cita => cita.estado === CITA_ESTADOS.ACTIVA)
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
// DISPONIBILIDAD (Operador) — con restricción por nómina y admin
// ======================================================
// 1. Si canceló el USUARIO: horario oculto solo para ESE usuario
// 2. Si canceló el ADMIN: horario oculto solo para EL USUARIO AFECTADO
//    (para que no reagende en el MISMO horario que le canceló)
// 3. Otros usuarios ven el horario disponible
export const getAvailableSchedules = async ({ agendaId, fecha, bloquesPosibles, nominaUsuarioActual, userIdActual }) => {

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

        // 🔥 CANCELADA POR USUARIO: Solo ocultar para esa nómina
        if (cita.estado === CITA_ESTADOS.CANCELADA_USUARIO) {
            if (String(cita.nominaCancelada) === String(nominaUsuarioActual)) {
                horasOcultasParaNomina.add(hora);
            }
            return;
        }

        // 🔥 CANCELADA POR ADMIN: Ocultar SOLO para el usuario afectado
        // Otros usuarios pueden agendar en ese horario
        if (cita.estado === CITA_ESTADOS.CANCELADA_ADMIN) {
            const usuarioAfectado = cita.userId || cita.usuarioId;
            // Si el usuario actual es el que tenía esa cita → bloquearle ese horario
            if (userIdActual && String(usuarioAfectado) === String(userIdActual)) {
                horasOcultasParaNomina.add(hora);
            }
            return;
        }

        // ACTIVA: Ocupada para todos
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
    // Verifica si el usuario ya tiene una cita ACTIVA en esta agenda específica.
    // 🔥 IMPORTANTE: Las citas canceladas por admin NO bloquean reagendamiento
    const qCampana = query(
        collection(db, "citas_medicas"),
        where("agendaId", "==", agendaId),
        where("userId", "==", userId)
    );

    const snapCampana = await getDocs(qCampana);

    // Filtrar: solo contar citas ACTIVAS (ignorar canceladas)
    const citasActivas = snapCampana.docs.filter(doc => {
        const cita = doc.data();
        return cita.estado === CITA_ESTADOS.ACTIVA;
    });

    if (citasActivas.length > 0) {
        throw new Error("Ya tienes un turno asignado en esta campaña.");
    }

    // ======================================================
    // 2. VALIDACIÓN: NO permitir citas en la MISMA FECHA (sin importar hora/campaña)
    // ======================================================
    // 🔥 CRÍTICO: Esto previene que un usuario aggende múltiples citas en el MISMO DÍA
    // Cada usuario solo puede tener UNA cita por día, punto.
    const qFecha = query(
        collection(db, "citas_medicas"),
        where("userId", "==", userId),
        where("fecha", "==", fecha)
    );

    const snapFecha = await getDocs(qFecha);

    const citasEnMismaFecha = snapFecha.docs.filter(doc => {
        const cita = doc.data();
        return cita.estado === CITA_ESTADOS.ACTIVA;
    });

    if (citasEnMismaFecha.length > 0) {
        throw new Error("Ya tienes una cita agendada en esta fecha. No puedes agendar dos citas en el mismo día.");
    }

    // ======================================================
    // 3. BLOQUEO DE HORARIO (Antiguo - DEPRECADO pero se mantiene para seguridad)
    // ======================================================
    const qHorario = query(
        collection(db, "citas_medicas"),
        where("userId", "==", userId),
        where("fecha", "==", fecha)
    );

    const snapHorario = await getDocs(qHorario);

    snapHorario.docs.forEach(doc => {
        const cita = doc.data();

        if (cita.estado !== CITA_ESTADOS.ACTIVA) {
            return;
        }

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

    const resolvedUserDocId = await resolveUserDocIdByFirebaseUid(userId);
    if (resolvedUserDocId) {
        const anioActual = new Date().getFullYear();
        const userYearCitaRef = doc(
            collection(db, "users", String(resolvedUserDocId), String(anioActual), "informacion", "CitasMedicas")
        );

        await setDoc(userYearCitaRef, {
            ...nuevaCita,
            id: userYearCitaRef.id,
            usuarioDocId: resolvedUserDocId,
            createdAt: serverTimestamp(),
        });
    }

    return {
        id: docRef.id,
        ...nuevaCita
    };
};
