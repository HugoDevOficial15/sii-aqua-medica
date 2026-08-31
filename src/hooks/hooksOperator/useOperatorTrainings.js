import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../useAuth";
import { getCapacitacionesDisponibles } from "../../services/capacitacionesService";

const MIN_APROBATORIO = 80;

export function useOperatorTrainings({ enabled = true } = {}) {
    const { user } = useAuth();

    const [rawTrainings, setRawTrainings] = useState([]);
    const lastRequestRef = useRef("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!enabled || (!user?.nomina && !user?.uid)) return;

        setLoading(true);
        setError(null);

        try {
            // Usar el servicio centralizado que ya filtra por asignación
            const data = await getCapacitacionesDisponibles(user);
            setRawTrainings(data);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error("Error cargando capacitaciones del operador:", err);
            }
            setError("No se pudieron cargar las capacitaciones. Intenta de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    }, [user?.nomina, user?.uid]);

    useEffect(() => {
        const key = `${user?.uid || ""}:${user?.nomina || ""}`;

        if (!enabled || (!user?.uid && !user?.nomina)) {
            lastRequestRef.current = "";
            setRawTrainings([]);
            return;
        }

        if (lastRequestRef.current === key) {
            return;
        }

        lastRequestRef.current = key;
        fetchData();
    }, [enabled, fetchData, user?.uid, user?.nomina]);

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
                if ((training.miPuntaje ?? 0) < MIN_APROBATORIO) {
                    reprobadas++;
                }
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
