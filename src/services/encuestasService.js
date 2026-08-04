// ============================================================
// Servicio centralizado de encuestas para la app móvil/operador.
//
// Único punto donde se decide "¿esta encuesta le corresponde a este
// usuario?" y "¿en qué estado está para él?". Antes esa lógica estaba
// repetida entre hooks y componentes; ahora todo pasa por aquí para
// evitar que cada pantalla la interprete distinto.
// ============================================================

import { db } from "../config/firebase";

import {
    collection,
    getDocs,
    query,
    where
} from "firebase/firestore";

const encuestasCollection = collection(db, "encuestas");
const respuestasCollection = collection(db, "respuestasEncuestas");

// Fecha local (YYYY-MM-DD) para comparar contra fechaFin, que se guarda
// como string de un <input type="date">. Se evita usar toISOString()
// (UTC) porque puede adelantar el día en husos horarios detrás de UTC
// (México), marcando encuestas como vencidas antes de tiempo.
const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// ============================================================
// Estructura estándar del campo "asignacion":
//   { tipo: "global" | "area" | "usuarios", valores: string[] }
//
// - global    -> valores siempre vacío, visible para todos.
// - area      -> valores contiene los nombres de área (catalogs/areas.js).
// - usuarios  -> valores contiene números de nómina.
//
// Compatibilidad: encuestas creadas antes de estandarizar este campo
// guardaban "todas las áreas" como { tipo: "area", valores: [] }. Se
// conserva ese caso como equivalente a "global" para no romperlas.
// ============================================================
export const usuarioEnAsignacion = (asignacion, usuario) => {

    if (!asignacion || !asignacion.tipo) {
        return false;
    }

    const valores = Array.isArray(asignacion.valores)
        ? asignacion.valores.map(String)
        : [];

    if (asignacion.tipo === "global") {
        return true;
    }

    if (asignacion.tipo === "area") {
        if (valores.length === 0) {
            // Encuesta antigua "todas las áreas" guardada sin migrar.
            return true;
        }
        return valores.includes(String(usuario?.area));
    }

    if (asignacion.tipo === "usuarios") {
        return valores.includes(String(usuario?.nomina));
    }

    return false;
};

// ============================================================
// getEncuestasDisponibles(usuario)
//
// Devuelve las encuestas asignadas al usuario autenticado, cruzadas
// con sus respuestas, con el estado ya calculado. Dos únicas lecturas
// a Firestore (encuestas activas + respuestas del usuario) sin
// importar cuántas encuestas o usuarios existan.
// ============================================================
export const getEncuestasDisponibles = async (usuario) => {

    if (!usuario?.nomina) {
        return [];
    }

    const [surveysSnap, responsesSnap] = await Promise.all([
        getDocs(query(encuestasCollection, where("activa", "==", true))),
        getDocs(query(respuestasCollection, where("nominaUsuario", "==", usuario.nomina)))
    ]);

    const respuestaPorEncuesta = new Map();

    responsesSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.idEncuesta) {
            respuestaPorEncuesta.set(data.idEncuesta, data);
        }
    });

    const today = getTodayLocal();

    return surveysSnap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(survey => usuarioEnAsignacion(survey.asignacion, usuario))
        .map(survey => {

            const respuesta = respuestaPorEncuesta.get(survey.id);
            const respondida = Boolean(respuesta);
            const vencida = !respondida && Boolean(survey.fechaFin) && today > survey.fechaFin;
            const disponible = !respondida && !vencida;

            let estado = "pendiente";
            if (respondida) estado = "respondida";
            else if (vencida) estado = "vencida";

            return {
                ...survey,

                id: survey.id,
                titulo: survey.titulo,
                descripcion: survey.descripcion,
                instructor: survey.instructor,
                modalidad: survey.modalidad,
                fechaInicio: survey.fechaInicio,
                fechaFin: survey.fechaFin,

                estado,
                respondida,
                disponible,
                vencida,

                miPuntaje: respuesta
                    ? (respuesta.puntuacionObtenida ?? respuesta.calificacion ?? null)
                    : null
            };

        });

};

// Atajo usado por tarjetas/contadores: solo las encuestas que el usuario
// todavía debe responder (no respondidas y aún vigentes).
export const getEncuestasPendientes = async (usuario) => {
    const encuestas = await getEncuestasDisponibles(usuario);
    return encuestas.filter(encuesta => encuesta.disponible);
};
