import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const requestProfileChangeFunction = httpsCallable(functions, "requestProfileChange");
const getAllRequestsFunction = httpsCallable(functions, "getAllRequests");
const getPendingRequestsFunction = httpsCallable(functions, "getPendingRequests");
const getUserRequestsFunction = httpsCallable(functions, "getUserRequests");
const approveRequestFunction = httpsCallable(functions, "approveRequest");
const rejectRequestFunction = httpsCallable(functions, "rejectRequest");
const eliminarSolicitudFunction = httpsCallable(functions, "eliminarSolicitud");

const CAMPOS_SOLICITABLES = [
    "nombre",
    "Genero",
    "area",
    "cumpleanos",
    "email",
    "fechaIngreso",
    "nomina",
    "puesto",
    "curp",
    "rfc",
    "nss",
];

export const resolveUserNomina = (user = {}) => {
    const rawNomina = user?.nomina ?? user?.nominaUsuario ?? user?.numeroNomina ?? user?.numeroDeNomina ?? user?.nominaEmpleado;
    if (rawNomina === undefined || rawNomina === null || rawNomina === "") {
        return null;
    }

    const numericNomina = Number(String(rawNomina).trim());
    return Number.isFinite(numericNomina) ? numericNomina : null;
};

const normalizeChanges = (changes = {}) => {
    const normalized = {};
    CAMPOS_SOLICITABLES.forEach((campo) => {
        if (changes[campo] !== undefined) {
            const value = changes[campo];
            if (campo === "nomina" && value !== "" && value !== null && value !== undefined) {
                const numeric = Number(String(value).trim());
                normalized[campo] = Number.isFinite(numeric) ? numeric : String(value).trim();
                return;
            }

            if (typeof value === "string") {
                normalized[campo] = value.trim();
                return;
            }

            normalized[campo] = value;
        }
    });
    return normalized;
};

export const requestProfileChange = async (user, changes) => {
    const normalizedUser = {
        ...user,
        nomina: resolveUserNomina(user),
    };

    if (!normalizedUser?.nomina) {
        return { success: false, error: "NOMINA_NOT_FOUND" };
    }

    const response = await requestProfileChangeFunction({
        user: normalizedUser,
        changes: normalizeChanges(changes),
    });

    return response.data || { success: false, error: "UNKNOWN_ERROR" };
};

export const getAllRequests = async () => {
    const response = await getAllRequestsFunction();
    return response.data || [];
};

export const getPendingRequests = async () => {
    const response = await getPendingRequestsFunction();
    return response.data || [];
};

export const getUserRequests = async (nomina) => {
    const response = await getUserRequestsFunction({ nomina });
    return response.data || [];
};

export const approveRequest = async (requestId, administradorRevision) => {
    const response = await approveRequestFunction({ requestId, administradorRevision });
    return response.data || { success: false, error: "UNKNOWN_ERROR" };
};

export const rejectRequest = async (requestId, administradorRevision, comentario) => {
    const response = await rejectRequestFunction({
        requestId,
        administradorRevision,
        comentario,
    });
    return response.data || { success: false, error: "UNKNOWN_ERROR" };
};

export const eliminarSolicitud = async (requestId) => {
    const response = await eliminarSolicitudFunction({ requestId });
    return response.data || { success: false, error: "UNKNOWN_ERROR" };
};