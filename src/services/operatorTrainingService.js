import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";

const trainingCollection = collection(db, "capacitaciones");

// Obtener capacitaciones asignadas al operador
export const getOperatorTrainings = async (userArea, userId) => {
    try {
        console.log("🔍 Obteniendo capacitaciones - Área:", userArea, "UID:", userId);

        const snapshot = await getDocs(trainingCollection);

        const trainings = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(training => {
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

        console.log("📊 Total capacitaciones para operador:", trainings.length);
        return trainings;
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