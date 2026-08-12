import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const trainingCollection = collection(db, "capacitaciones");
const responseCollection = collection(db, "respuestasCapacitaciones");

// Obtener capacitaciones asignadas al operador CON ESTADOS ACTUALIZADOS
export const getOperatorTrainings = async (userArea, userId) => {
    try {
        console.log("🔍 Obteniendo capacitaciones - Área:", userArea, "UID:", userId);

        const snapshot = await getDocs(trainingCollection);

        const trainingsAsignadas = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(training => {
                // Filtrar: solo activas (o que no tengan el campo activa definido)
                if (training.activa === false) return false;

                const asignacion = training.asignacion || {};
                const tipo = asignacion.tipo;
                const valores = asignacion.valores || [];

                // 1. Si es global
                if (tipo === "global") {
                    console.log(`✅ "${training.titulo}" - Asignado a TODOS`);
                    return true;
                }

                // 2. Si es por área
                if (tipo === "area" && userArea && valores.includes(userArea)) {
                    console.log(`✅ "${training.titulo}" - Asignado a área ${userArea}`);
                    return true;
                }

                // 3. Si es por usuario específico
                if (tipo === "usuarios" && userId && valores.includes(String(userId))) {
                    console.log(`✅ "${training.titulo}" - Asignado al usuario ${userId}`);
                    return true;
                }

                return false;
            });

        // Obtener respuestas del usuario
        let respuestasUsuario = [];
        if (userId) {
            const qRespuestas = query(
                responseCollection,
                where("userId", "==", userId)
            );
            const snapshotRespuestas = await getDocs(qRespuestas);
            respuestasUsuario = snapshotRespuestas.docs.map(doc => doc.data());
        }

        // Enriquecer con estado actual
        const trainingsEnriquecidas = trainingsAsignadas.map(training => {
            const miRespuesta = respuestasUsuario.find(r => r.capacitacionId === training.id);
            const miPuntaje = miRespuesta?.puntuacionObtenida || miRespuesta?.miPuntaje || null;
            const miEstado = miRespuesta?.estadoActual || null;

            let estadoFinal = miEstado || training.estadoActual || "pendiente";

            return {
                ...training,
                estadoActual: estadoFinal,
                miPuntaje,
                intentos: miRespuesta?.intentos || training.intentos || 0
            };
        });

        console.log("📊 Total capacitaciones para operador:", trainingsEnriquecidas.length);
        return trainingsEnriquecidas;
    } catch (error) {
        console.error("Error fetching operator trainings:", error);
        return [];
    }
}

// Obtener conteos por estado
export const getTrainingStats = (trainings) => {
    return {
        pendientes: trainings.filter(t => (t.estado || "pendiente") === "pendiente").length,
        aprobadas: trainings.filter(t => t.estado === "aprobada").length,
        certificados: trainings.filter(t => t.estado === "certificado").length
    };
}