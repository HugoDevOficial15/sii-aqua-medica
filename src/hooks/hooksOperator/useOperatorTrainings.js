import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../useAuth";
import { getOperatorTrainings } from "../../services/operatorTrainingService";

const MIN_APROBATORIO = 80;

export function useOperatorTrainings() {
    const { user } = useAuth();

    const [rawTrainings, setRawTrainings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!user?.area && !user?.uid) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getOperatorTrainings(user?.area, user?.uid);
            setRawTrainings(data);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error("Error cargando capacitaciones del operador:", err);
            }
            setError("No se pudieron cargar las capacitaciones. Intenta de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    }, [user?.area, user?.uid]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const trainings = useMemo(() => {
        return rawTrainings.map(training => ({
            ...training,
            estadoActual: training.estadoActual || "pendiente"
        }));
    }, [rawTrainings]);

    const metrics = useMemo(() => {
        let pendientes = 0;
        let completadas = 0;
        let reprobadas = 0;

        trainings.forEach(training => {
            if (training.estadoActual === "pendiente") {
                pendientes++;
            } else if (training.estadoActual === "completada") {
                completadas++;
            } else if (["reprobada", "bloqueada", "vencida", "pendiente_validacion"].includes(training.estadoActual)) {
                reprobadas++;
            }
        });

        return {
            disponibles: pendientes,
            completadas,
            reprobadas,
            pendientesCount: pendientes
        };
    }, [trainings]);

    return {
        trainings,
        metrics,
        loading,
        error,
        refetch: fetchData
    };
}
