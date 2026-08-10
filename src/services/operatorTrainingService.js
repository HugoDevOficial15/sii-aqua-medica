import { db } from "../config/firebase";
import { query, where, collection, getDocs } from "firebase/firestore";

const trainingCollection = collection(db, "capacitaciones");

// Obtener capacitaciones asignadas al operador
export const getOperatorTrainings = async (userArea, userId) => {
    try {
        const q = query(
            trainingCollection,
            where("asignacion.tipo", "in", ["global", "area", "usuarios"])
        );

        const snapshot = await getDocs(q);

        // Filtrar capacitaciones por asignación del operador
        const trainings = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(training => {
                const asignacion = training.asignacion;

                if (asignacion.tipo === "global") return true;

                if (asignacion.tipo === "area" && userArea) {
                    return asignacion.valores?.includes(userArea);
                }

                if (asignacion.tipo === "usuarios") {
                    return asignacion.valores?.includes(String(userId));
                }

                return false;
            });

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
