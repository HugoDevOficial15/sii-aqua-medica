import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const callCitasFunction = (name) => httpsCallable(functions, name);

export const getCitasMedicas = async ({ agendaId = null, userId = null, estado = null } = {}) => {
    const result = await callCitasFunction("getCitasMedicas")({ agendaId, userId, estado });
    return result?.data?.citas ?? [];
};

export const atenderCita = async (id, observacion) => {
    const result = await callCitasFunction("atenderCita")({ id, observacion });
    return result?.data ?? { ok: true };
};

// ======================================================
// CANCELAR CITA INDIVIDUAL POR ADMINISTRADOR
// ======================================================
// Cancela UNA cita específica solicitada por admin con motivo obligatorio.
// Si la cita tiene usuario asignado → notifica al usuario.
// Si la cita NO tiene usuario → no genera notificación.
export const cancelarCitaPorAdmin = async (citaId, motivo, adminUid, adminNombre) => {
    const result = await callCitasFunction("cancelarCitaPorAdmin")({
        citaId,
        motivo,
        adminUid,
        adminNombre
    });

    return result?.data ?? { ok: true };
};

export const getCitasPorAgenda = async (agendaId) => {
    const result = await callCitasFunction("getCitasPorAgenda")({ agendaId });
    return result?.data?.citas ?? [];
};

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

        const result = await callCitasFunction("getUserAppointments")({ nomina, userId });
        return result?.data?.citas ?? [];
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
    const result = await callCitasFunction("cancelAppointmentByUser")({
        citaId,
        user,
        motivo
    });

    return result?.data ?? { ok: true };
};

// ======================================================
// CANCELACIÓN MASIVA POR AGENDA (Administrador)
// ======================================================
// Agrega al batch recibido la cancelación de todas las citas cancelables
// de una agenda. Retorna los datos de las citas para crear notificaciones
// después (fuera del batch).
export const queueCancelacionCitasPorAgenda = async (batch, agendaId, motivo, adminUid) => {
    throw new Error("Este helper ya no se usa desde el frontend; usa cancelAppointmentsByAgenda en la función backend.");
};

export const cancelAppointmentsByAgenda = async (agendaId, motivo, adminUid) => {
    const result = await callCitasFunction("cancelAppointmentsByAgenda")({
        agendaId,
        motivo,
        adminUid
    });

    return result?.data ?? { success: true, citasCanceladas: 0 };
};

// ======================================================
// DISPONIBILIDAD (Operador) — con restricción por nómina y admin
// ======================================================
// 1. Si canceló el USUARIO: horario oculto solo para ESE usuario
// 2. Si canceló el ADMIN: horario oculto solo para EL USUARIO AFECTADO
//    (para que no reagende en el MISMO horario que le canceló)
// 3. Otros usuarios ven el horario disponible
export const getAvailableSchedules = async ({ agendaId, fecha, bloquesPosibles, nominaUsuarioActual, userIdActual }) => {
    const result = await callCitasFunction("getAvailableSchedules")({
        agendaId,
        fecha,
        bloquesPosibles,
        nominaUsuarioActual,
        userIdActual
    });

    return result?.data ?? {
        bloques: bloquesPosibles,
        ocupadas: []
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
    const result = await callCitasFunction("bookAppointment")(appointmentData);

    return result?.data?.cita ?? null;
};

export const notifyAdminsForAppointmentEvent = async ({
    titulo,
    mensaje,
    destino = "citas-medicas",
    accion = "cita_agendada",
    extra = {},
    rolesPermitidos = ["admin_medico", "admin_sistemas", "admin", "administrador", "admin_general"]
}) => {
    const result = await callCitasFunction("notifyAdminsForAppointmentEvent")({
        titulo,
        mensaje,
        destino,
        accion,
        extra,
        rolesPermitidos
    });

    return result?.data ?? { ok: true, enviados: 0 };
};
