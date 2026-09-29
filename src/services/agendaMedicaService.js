import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const callAgendaFunction = (name) => httpsCallable(functions, name);

export const getAgendasMedicas = async ({ estado = null } = {}) => {
    const result = await callAgendaFunction("getAgendasMedicas")({ estado });
    return result?.data?.agendas ?? [];
};

export const crearAgenda = async (data = {}) => {
    const result = await callAgendaFunction("crearAgenda")(data || {});
    return result?.data?.id ?? null;
};

export const toggleAgendaEstado = async (id, estadoActual) => {
    const result = await callAgendaFunction("toggleAgendaEstado")({ id, estadoActual });
    return result?.data ?? { ok: true };
};

export const updateAgenda = async (id, agendaUpdates = {}) => {
    const result = await callAgendaFunction("updateAgenda")({ id, agendaUpdates });
    return result?.data ?? { ok: true };
};

export const deleteAgenda = async (id, nombre = "") => {
    const result = await callAgendaFunction("deleteAgenda")({ id, nombre });
    return result?.data ?? { ok: true };
};

export const updateAgendaWithBatch = async (agendaId, agendaUpdates, motivo, adminUid) => {
    const result = await callAgendaFunction("updateAgendaWithBatch")({
        agendaId,
        agendaUpdates: agendaUpdates || {},
        motivo: motivo || "",
        adminUid: adminUid || null,
    });

    return result?.data ?? { success: true, citasCanceladas: 0 };
};