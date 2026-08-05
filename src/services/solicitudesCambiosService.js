import { db } from "../config/firebase";
import { createNotification } from "../utils/createNotification"; // 👈 Asegúrate de que esta ruta sea correcta según la ubicación de tu archivo
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from "firebase/firestore";

import { updateUserFields } from "./usersService";

const requestCollection = collection(db, "solicitudesCambios");

// Campos de perfil que un operador puede solicitar cambiar. Se usa tanto
// para armar el snapshot de "datosActuales" como para limitar qué llaves
// de "changes" se guardan como "datosSolicitados" (nunca más que esto).
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
    "nss"
];

const snapshotCampos = (data) => {
    const snap = {};
    CAMPOS_SOLICITABLES.forEach(campo => {
        snap[campo] = data?.[campo] ?? "";
    });
    return snap;
};

// ======================
// CREAR SOLICITUD (Operador)
// ======================
export const requestProfileChange = async (user, changes) => {

    if (!user?.nomina) {
        return { success: false, error: "NOMINA_NOT_FOUND" };
    }

    const datosSolicitados = {};
    CAMPOS_SOLICITABLES.forEach(campo => {
        if (changes[campo] !== undefined) {
            datosSolicitados[campo] = changes[campo];
        }
    });

    const docRef = await addDoc(requestCollection, {
        idUsuario: user.id,
        uid: user.uid || null,
        nominaActual: user.nomina,
        nombreActual: user.nombre || "",
        rol: user.rol || "",
        fechaSolicitud: serverTimestamp(),
        estado: "Pendiente",
        datosActuales: snapshotCampos(user),
        datosSolicitados,
        comentariosAdministrador: "",
        fechaRevision: null,
        administradorRevision: null
    });

    return { success: true, id: docRef.id };
};

// ======================
// LISTAR (Administrador)
// ======================
export const getAllRequests = async () => {
    const q = query(requestCollection, orderBy("fechaSolicitud", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));
};

export const getPendingRequests = async () => {
    const q = query(requestCollection, where("estado", "==", "Pendiente"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));
};

// ======================
// MIS SOLICITUDES (Operador)
// ======================
export const getUserRequests = async (nomina) => {
    const q = query(
        requestCollection,
        where("nominaActual", "==", nomina)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            const fechaA = a.fechaSolicitud?.toMillis?.() ?? 0;
            const fechaB = b.fechaSolicitud?.toMillis?.() ?? 0;
            return fechaB - fechaA;
        });
};

// ======================
// APROBAR (Administrador)
// ======================
export const approveRequest = async (requestId, administradorRevision) => {

    const requestRef = doc(db, "solicitudesCambios", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
        return { success: false, error: "REQUEST_NOT_FOUND" };
    }

    const solicitud = requestSnap.data();

    const datosSolicitados = { ...solicitud.datosSolicitados };
    if (datosSolicitados.nomina !== undefined) {
        datosSolicitados.nomina = Number(datosSolicitados.nomina);
    }

    const result = await updateUserFields(
        solicitud.nominaActual,
        datosSolicitados
    );

    if (!result.success) {
        return result;
    }

    await updateDoc(requestRef, {
        estado: "Aprobada",
        fechaRevision: serverTimestamp(),
        administradorRevision
    });

    // 🔥 USAMOS LA UTILIDAD CREATE NOTIFICATION (Dispara la Push Notification)
    await createNotification({
        IdUsuario: solicitud.idUsuario, // UID del operador
        Titulo: "Solicitud aprobada",
        Mensaje: "Tus cambios de perfil fueron aprobados.",
        Destino: "/solicitudes"
    });

    return { success: true, data: result.data };

};

// ======================
// RECHAZAR (Administrador)
// ======================
export const rejectRequest = async (requestId, administradorRevision, comentario) => {

    const requestRef = doc(db, "solicitudesCambios", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
        return { success: false, error: "REQUEST_NOT_FOUND" };
    }

    const solicitud = requestSnap.data();

    await updateDoc(requestRef, {
        estado: "Rechazada",
        comentariosAdministrador: comentario,
        fechaRevision: serverTimestamp(),
        administradorRevision
    });

    // 🔥 USAMOS LA UTILIDAD CREATE NOTIFICATION (Dispara la Push Notification)
    await createNotification({
        IdUsuario: solicitud.idUsuario, // UID del operador
        Titulo: "Solicitud rechazada",
        Mensaje: `Tu solicitud fue rechazada. Motivo: ${comentario || "Sin comentarios"}`,
        Destino: "/solicitudes"
    });

    return { success: true };

};