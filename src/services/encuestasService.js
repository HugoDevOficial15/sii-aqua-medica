import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { isSurveyTimeExpired } from "../utils/surveyTiming";

// ============================================================
// CONSULTA DE ENCUESTAS DISPONIBLES PARA UN USUARIO
// ============================================================
// Filtra encuestas según el rol del usuario y la asignación:
// 1. Globales: visibles para todos
// 2. Por área: solo si user.area está en asignacion.valores
// 3. Por usuario: solo si user.nomina está en asignacion.valores
// Además, cruza con la colección "respuestas" para determinar
// si ya respondió y otros estados.
export const getEncuestasDisponibles = async (usuario) => {
    if (!usuario) return [];

    try {
        // Traer todas las encuestas (sin filtro de activa para mejor compatibilidad)
        const q = query(
            collection(db, "encuestas"),
            orderBy("fechaInicio", "desc")
        );

        const snapshot = await getDocs(q);
        const encuestas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Filtrar: solo activas (o que no tengan el campo activa definido)
        const encuestasActivas = encuestas.filter(e => e.activa !== false);

        // Filtrar por acceso (según asignacion)
        const encuestasAccesibles = encuestasActivas.filter(encuesta => {
            const asignacion = encuesta.asignacion || { tipo: "global", valores: [] };

            switch (asignacion.tipo) {
                case "global":
                    return true;

                case "area":
                    // Comparar area del usuario con los valores de asignación
                    return usuario.area && asignacion.valores.includes(usuario.area);

                case "usuarios":
                    // Comparar nómina (o username) con los valores de asignación
                    const nominaStr = String(usuario.nomina || usuario.username || "").trim();
                    return nominaStr && asignacion.valores.some(v => String(v).trim() === nominaStr);

                default:
                    return false;
            }
        });

        // Traer respuestas del usuario para este conjunto de encuestas
        // NOTA: Usar la colección centralizada "respuestasEncuestas"
        const idsEncuestas = encuestasAccesibles.map(e => e.id);
        let respuestasUsuario = [];

        if (idsEncuestas.length > 0) {
            // IMPORTANTE: Usar usuario.uid (UID de Firebase), NO usuario.id (ID del documento)
            const qRespuestas = query(
                collection(db, "respuestasEncuestas"),
                where("userId", "==", usuario.uid),
                where("encuestaId", "in", idsEncuestas)
            );
            const snapshotRespuestas = await getDocs(qRespuestas);
            respuestasUsuario = snapshotRespuestas.docs.map(doc => doc.data());
        }

        // Enriquecer encuestas con información calculada
        const hoy = new Date();
        const encuestasEnriquecidas = encuestasAccesibles.map(encuesta => {
            const respondida = respuestasUsuario.some(r => r.encuestaId === encuesta.id);

            const fechaInicio = encuesta.fechaInicio?.toDate?.()
                || new Date(encuesta.fechaInicio);
            const fechaFin = encuesta.fechaFin?.toDate?.()
                || new Date(encuesta.fechaFin);

            const vencida = isSurveyTimeExpired({
                fechaInicio: encuesta.fechaInicio,
                fechaFin: encuesta.fechaFin,
                horaInicio: encuesta.horaInicio || "00:00",
                horaFin: encuesta.horaFin || "23:59"
            }, hoy);

            const disponible = !respondida && !vencida && (!encuesta.horaInicio || hoy >= new Date(`${fechaInicio.toISOString().split("T")[0]}T${encuesta.horaInicio}:00`));

            const miRespuesta = respuestasUsuario.find(r => r.encuestaId === encuesta.id);
            const miPuntaje = miRespuesta?.puntuacionObtenida ?? miRespuesta?.puntajeFinal ?? null;
            const miEstado = miRespuesta?.estadoActual || null;

            let estadoFinal = miEstado;
            if (!estadoFinal) {
                estadoFinal = vencida ? "vencida" : (respondida ? "completada" : "pendiente");
            }

            return {
                id: encuesta.id,
                titulo: encuesta.titulo || "",
                descripcion: encuesta.descripcion || "",
                instructor: encuesta.instructor || "",
                modalidad: encuesta.modalidad || "",
                fechaCurso: encuesta.fechaCurso || "",
                fechaInicio: fechaInicio && !Number.isNaN(fechaInicio.getTime()) ? fechaInicio.toISOString().split("T")[0] : "",
                fechaFin: fechaFin && !Number.isNaN(fechaFin.getTime()) ? fechaFin.toISOString().split("T")[0] : "",
                horaInicio: encuesta.horaInicio || "",
                horaFin: encuesta.horaFin || "",
                duracion: encuesta.duracionHoras || "0",
                tipoCurso: encuesta.tipoCurso || "",
                formaEvaluacion: encuesta.formaEvaluacion || "",

                preguntas: encuesta.preguntas || [],
                duracionHoras: encuesta.duracionHoras || "0",
                duracionMinutos: encuesta.duracionMinutos || "0",
                intentos: miRespuesta?.intentos || 0,

                estado: estadoFinal,
                estadoActual: estadoFinal,
                respondida,
                disponible: estadoFinal === "pendiente" && disponible,
                vencida,
                miPuntaje
            };
        });

        return encuestasEnriquecidas;

    } catch (error) {
        console.error("Error al obtener encuestas disponibles:", error);
        return [];
    }
};

// ============================================================
// CONTAR ENCUESTAS PENDIENTES
// ============================================================
// Devuelve el número de encuestas que el usuario aún no ha
// respondido y que no están vencidas.
export const contarEncuestasPendientes = async (usuario) => {
    const encuestas = await getEncuestasDisponibles(usuario);
    return encuestas.filter(e => e.disponible).length;
};
