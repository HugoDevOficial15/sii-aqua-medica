import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";

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

        if (idsCapacitaciones.length > 0) {
            // IMPORTANTE: Usar usuario.uid (UID de Firebase), NO usuario.id (ID del documento)
            const qRespuestas = query(
                collection(db, "respuestasCapacitaciones"),
                where("userId", "==", usuario.uid),
                where("capacitacionId", "in", idsCapacitaciones)
            );
            const snapshotRespuestas = await getDocs(qRespuestas);
            respuestasUsuario = snapshotRespuestas.docs.map(doc => doc.data());
        }

        // Enriquecer capacitaciones con información calculada
        const hoy = new Date();
        const capacitacionesEnriquecidas = capacitacionesAccesibles.map(capacitacion => {
            const respondida = respuestasUsuario.some(r => r.capacitacionId === capacitacion.id);

            // Parsear fechas (pueden venir como Timestamp o string)
            const fechaInicio = capacitacion.fechaInicio?.toDate?.()
                || new Date(capacitacion.fechaInicio);
            const fechaFin = capacitacion.fechaFin?.toDate?.()
                || new Date(capacitacion.fechaFin);

            const vencida = hoy > fechaFin;
            const disponible = !vencida && !respondida;

            // Buscar respuesta para extraer puntaje y estado
            const miRespuesta = respuestasUsuario.find(r => r.capacitacionId === capacitacion.id);
            const miPuntaje = miRespuesta?.puntuacionObtenida || miRespuesta?.puntajeFinal || null;
            const miEstado = miRespuesta?.estadoActual || null;

            // Determinar estado: usar el guardado en Firebase si existe, si no calcular
            let estadoFinal = miEstado;
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
                intentos: miRespuesta?.intentos || 0,

                // Calculados
                estado: estadoFinal,
                estadoActual: estadoFinal,
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
