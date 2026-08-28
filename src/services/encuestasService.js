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
        const nominaStr = String(usuario.nomina || usuario.username || "").trim();
        const queries = [];

        queries.push(
            query(
                collection(db, "encuestas"),
                where("asignacion.tipo", "==", "global"),
                orderBy("fechaInicio", "desc")
            )
        );

        if (usuario.area) {
            queries.push(
                query(
                    collection(db, "encuestas"),
                    where("asignacion.tipo", "==", "area"),
                    where("asignacion.valores", "array-contains", usuario.area),
                    orderBy("fechaInicio", "desc")
                )
            );
        }

        if (nominaStr) {
            queries.push(
                query(
                    collection(db, "encuestas"),
                    where("asignacion.tipo", "==", "usuarios"),
                    where("asignacion.valores", "array-contains", nominaStr),
                    orderBy("fechaInicio", "desc")
                )
            );
        }

        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        const encuestasMap = new Map();

        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(docSnap => {
                const data = { id: docSnap.id, ...docSnap.data() };
                if (data.activa !== false && !encuestasMap.has(data.id)) {
                    encuestasMap.set(data.id, data);
                }
            });
        });

        const encuestasAccesibles = Array.from(encuestasMap.values());

        const idsEncuestas = encuestasAccesibles.map(e => e.id);
        let respuestasUsuario = [];

        if (idsEncuestas.length > 0 && usuario.uid) {
            const qRespuestas = query(
                collection(db, "respuestasEncuestas"),
                where("userId", "==", usuario.uid),
                where("encuestaId", "in", idsEncuestas)
            );
            const snapshotRespuestas = await getDocs(qRespuestas);
            respuestasUsuario = snapshotRespuestas.docs.map(doc => doc.data());
        }

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
