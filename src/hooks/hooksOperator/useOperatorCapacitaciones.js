import { useState, useEffect, useCallback, useMemo } from "react";

import { useAuth } from "../useAuth";

import { getCapacitacionesDisponibles } from "../../services/capacitacionesService";

const MIN_APROBATORIO = 80;

export function useOperatorCapacitaciones() {

    const { user } = useAuth();

    const [rawCapacitaciones, setRawCapacitaciones] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {

        if (!user?.nomina && !user?.uid) return;

        setLoading(true);
        setError(null);

        try {

            // Única fuente de verdad: el servicio centralizado ya hace el
            // filtrado por asignación (global/área/usuarios) y el cruce
            // con las respuestas del usuario.
            const data = await getCapacitacionesDisponibles(user);

            setRawCapacitaciones(data);

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
        fetchData();
    }, [fetchData]);

    // Adapta la salida del servicio al contrato que consumen las pantallas
    const capacitaciones = useMemo(() => {

        return rawCapacitaciones.map(training => ({
            ...training,
            estadoActual: training.respondida ? "completada" : training.estado,
            miPuntaje: training.miPuntaje
        }));

    }, [rawCapacitaciones]);

    const metrics = useMemo(() => {

        let pendientes = 0;
        let vencidas = 0;
        let completadas = 0;
        let reprobadas = 0;

        capacitaciones.forEach(training => {

            if (training.estadoActual === "pendiente") {
                pendientes++;
            } else if (training.estadoActual === "vencida") {
                vencidas++;
            } else if (training.estadoActual === "completada") {
                completadas++;
                if ((training.miPuntaje ?? 0) < MIN_APROBATORIO) {
                    reprobadas++;
                }
            }

        });

        return {
            disponibles: pendientes + vencidas,
            completadas,
            reprobadas,
            pendientesCount: pendientes
        };

    }, [capacitaciones]);

    return {
        capacitaciones,
        metrics,
        loading,
        error,
        refetch: fetchData
    };
}
