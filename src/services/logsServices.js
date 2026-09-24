import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const getEquipoLogsFunction = httpsCallable(functions, "getEquipoLogs");
const createEquipoLogFunction = httpsCallable(functions, "createEquipoLog");

const formatLogFecha = (value) => {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    if (typeof value?.toDate === "function") {
        return formatLogFecha(value.toDate());
    }

    if (typeof value === "string") {
        return value;
    }

    return "";
};

export const getLogsEquipo = async (equipoId) => {
    const result = await getEquipoLogsFunction({ equipoId });
    const logs = Array.isArray(result?.data) ? result.data : [];

    return logs.map((log) => ({
        ...log,
        fechaServicio: log.fechaServicio || formatLogFecha(log.createdAt) || "Sin fecha",
    }));
};

export const createLogEquipo = async (equipoId, payload) => {
    const logPayload = {
        ...payload,
        fechaServicio: payload?.fechaServicio || formatLogFecha(new Date()),
    };

    const result = await createEquipoLogFunction({ equipoId, ...logPayload });
    return result?.data ?? null;
};