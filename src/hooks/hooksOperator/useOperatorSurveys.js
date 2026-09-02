import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useAuth } from "../useAuth";

import { getEncuestasDisponibles } from "../../services/encuestasService";

import { MIN_APROBATORIO } from "../../constants/surveyConstants";

export function useOperatorSurveys({ enabled = true } = {}) {

    const { user } = useAuth();

    const [rawSurveys, setRawSurveys] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {

        if (!enabled || !user?.nomina) return;

        setLoading(true);
        setError(null);

        try {

            // Cada vez que se entra al módulo se debe consultar Firestore para
            // reflejar encuestas recién creadas o reasignadas.
            const data = await getEncuestasDisponibles(user, { forceRefresh: true });

            setRawSurveys(data);

        } catch (err) {

            if (import.meta.env.DEV) {
                console.error("Error cargando encuestas del operador:", err);
            }

            setError("No se pudieron cargar las encuestas. Intenta de nuevo más tarde.");

        } finally {

            setLoading(false);

        }

    }, [enabled, user]);

    useEffect(() => {
        if (!enabled || !user?.uid || !user?.nomina) {
            setRawSurveys([]);
            return;
        }

        fetchData();
    }, [enabled, fetchData, user?.uid, user?.nomina]);

    // Adapta la salida del servicio (estado/miPuntaje) al contrato que ya
    // consumen las pantallas existentes (estadoActual/miPuntaje).
    const surveys = useMemo(() => {

        return rawSurveys.map(survey => ({
            ...survey,
            estadoActual: survey.respondida ? "completada" : survey.estado,
            miPuntaje: survey.miPuntaje
        }));

    }, [rawSurveys]);

    const metrics = useMemo(() => {

        let pendientes = 0;
        let vencidas = 0;
        let completadas = 0;
        let reprobadas = 0;

        surveys.forEach(survey => {

            if (survey.estadoActual === "pendiente") {
                pendientes++;
            } else if (survey.estadoActual === "vencida") {
                vencidas++;
            } else if (survey.estadoActual === "completada") {
                completadas++;
                if ((survey.miPuntaje ?? 0) < MIN_APROBATORIO) {
                    reprobadas++;
                }
            }

        });

        return {
            disponibles: pendientes + vencidas,
            respondidas: completadas,
            reprobadas,
            pendientesCount: pendientes
        };

    }, [surveys]);

    return {
        surveys,
        metrics,
        loading,
        error,
        refetch: fetchData
    };
}
