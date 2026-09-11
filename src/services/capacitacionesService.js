import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { isSurveyTimeExpired } from "../utils/surveyTiming";

// ============================================================
// CONSULTA DE CAPACITACIONES DISPONIBLES PARA UN USUARIO
// ============================================================
// Filtra capacitaciones según el rol del usuario y la asignación:
// 1. Globales: visibles para todos
// 2. Por área: solo si user.area está en asignacion.valores
// 3. Por usuario: solo si user.nomina está en asignacion.valores
// Además, cruza con la colección "respuestasCapacitaciones" para determinar
// si ya respondió y otros estados.
export const getCapacitacionesDisponibles = async (usuario) => {
    if (!usuario) return [];

    try {
        // Traer todas las capacitaciones (sin filtro de activa para mejor compatibilidad)
        const q = query(
            collection(db, "capacitaciones"),
            orderBy("fechaInicio", "desc")
        );

        const snapshot = await getDocs(q);
        const capacitaciones = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Filtrar: solo activas (o que no tengan el campo activa definido)
        const capacitacionesActivas = capacitaciones.filter(e => e.activa !== false);

        // Filtrar por acceso (según asignacion)
        const capacitacionesAccesibles = capacitacionesActivas.filter(capacitacion => {
            const asignacion = capacitacion.asignacion || { tipo: "global", valores: [] };

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

        // Traer respuestas del usuario para este conjunto de capacitaciones
        const idsCapacitaciones = capacitacionesAccesibles.map(e => e.id);
        let respuestasUsuario = [];

        if (idsCapacitaciones.length > 0 && usuario.uid) {
            const bucketQueries = idsCapacitaciones.flatMap((capacitacionId) => [
                query(collection(db, "respuestasCapacitaciones", String(capacitacionId), "pendientes"), where("userId", "==", usuario.uid)),
                query(collection(db, "respuestasCapacitaciones", String(capacitacionId), "aprobados"), where("userId", "==", usuario.uid)),
                query(collection(db, "respuestasCapacitaciones", String(capacitacionId), "reprobados"), where("userId", "==", usuario.uid))
            ]);

            const bucketSnapshots = await Promise.all(bucketQueries.map(q => getDocs(q)));
            respuestasUsuario = bucketSnapshots.flatMap(snapshot =>
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            );
        }

        // Enriquecer capacitaciones con información calculada
        const hoy = new Date();
        const getResponseTimestamp = (response) => {
            const rawValue = response?.fechaRespuesta ?? response?.fechaEnviado ?? response?.createdAt ?? 0;

            if (!rawValue) return 0;
            if (typeof rawValue?.toDate === "function") return rawValue.toDate().getTime();
            if (typeof rawValue?.seconds === "number") return rawValue.seconds * 1000;
            if (rawValue instanceof Date) return rawValue.getTime();

            const parsed = Date.parse(rawValue);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const capacitacionesEnriquecidas = capacitacionesAccesibles.map(capacitacion => {
            const respuestasDeCapacitacion = respuestasUsuario.filter(r => r.capacitacionId === capacitacion.id);
            const tienePreguntasAbiertas = (capacitacion.preguntas || []).some(p => p?.tipo === "abierta");
            const respuestasFinales = respuestasDeCapacitacion.filter(response =>
                !(response?.estadoActual === "pendiente_validacion" || response?.tieneRespuestasAbiertas)
            );
            const respondida = respuestasFinales.length > 0 || respuestasDeCapacitacion.length > 0;

            // Parsear fechas (pueden venir como Timestamp o string)
            const fechaInicio = capacitacion.fechaInicio?.toDate?.()
                || new Date(capacitacion.fechaInicio);
            const fechaFin = capacitacion.fechaFin?.toDate?.()
                || new Date(capacitacion.fechaFin);

            const vencida = isSurveyTimeExpired({
                fechaInicio: capacitacion.fechaInicio,
                fechaFin: capacitacion.fechaFin,
                horaInicio: capacitacion.horaInicio || "00:00",
                horaFin: capacitacion.horaFin || "23:59"
            }, hoy);

            const disponible = !respondida && !vencida && (!capacitacion.horaInicio || hoy >= new Date(`${fechaInicio.toISOString().split("T")[0]}T${capacitacion.horaInicio}:00`));

            // Buscar respuesta para extraer puntaje y estado
            const miRespuesta = respuestasDeCapacitacion.reduce((latest, response) => {
                if (!latest) return response;

                const latestDate = getResponseTimestamp(latest);
                const responseDate = getResponseTimestamp(response);
                return responseDate >= latestDate ? response : latest;
            }, null);
            const totalIntentos = Math.max(
                respuestasDeCapacitacion.length,
                Number(miRespuesta?.intentos || 0)
            );
            const miPuntaje = miRespuesta?.puntuacionObtenida || miRespuesta?.puntajeFinal || null;
            const miEstado = miRespuesta?.estadoActual || null;
            const enRevision = Boolean((miEstado === "pendiente_validacion" || miRespuesta?.tieneRespuestasAbiertas) && tienePreguntasAbiertas);

            let estadoFinal = miEstado;
            if (enRevision) {
                estadoFinal = "pendiente";
            }
            if (!estadoFinal) {
                estadoFinal = vencida ? "vencida" : (respondida ? "completada" : "pendiente");
            }

            return {
                id: capacitacion.id,
                titulo: capacitacion.titulo || "",
                descripcion: capacitacion.descripcion || "",
                instructor: capacitacion.instructor || "",
                modalidad: capacitacion.modalidad || "",
                fechaCurso: capacitacion.fechaCurso || "",
                fechaInicio: fechaInicio.toISOString().split("T")[0],
                fechaFin: fechaFin.toISOString().split("T")[0],
                horaInicio: capacitacion.horaInicio || "",
                horaFin: capacitacion.horaFin || "",
                duracion: capacitacion.duracionHoras || "0",
                tipoCurso: capacitacion.tipoCurso || "",
                formaEvaluacion: capacitacion.formaEvaluacion || "",

                // Preguntas
                preguntas: capacitacion.preguntas || [],
                duracionHoras: capacitacion.duracionHoras || "0",
                duracionMinutos: capacitacion.duracionMinutos || "0",
                intentos: totalIntentos,

                // Calculados
                estado: estadoFinal,
                estadoActual: estadoFinal,
                enRevision,
                respondida,
                disponible: estadoFinal === "pendiente" && !vencida,
                vencida,
                miPuntaje
            };
        });

        return capacitacionesEnriquecidas;

    } catch (error) {
        console.error("Error al obtener capacitaciones disponibles:", error);
        return [];
    }
};

// ============================================================
// CONTAR CAPACITACIONES PENDIENTES
// ============================================================
// Devuelve el número de capacitaciones que el usuario aún no ha
// respondido y que no están vencidas.
export const contarCapacitacionesPendientes = async (usuario) => {
    const capacitaciones = await getCapacitacionesDisponibles(usuario);
    return capacitaciones.filter(e => e.disponible).length;
};
