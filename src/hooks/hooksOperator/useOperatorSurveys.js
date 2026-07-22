import { useState, useEffect, useCallback, useMemo } from "react";

import { useAuth } from "../useAuth";

import { getOperatorSurveys } from "../../services/servicesOperator/operatorSurveyService";
import { getMyResponses } from "../../services/servicesOperator/operatorSurveyResponseService";

import { MIN_APROBATORIO } from "../../constants/surveyConstants";

// Fecha local (YYYY-MM-DD) para comparar contra fechaFin, que se guarda
// como string de un <input type="date">. Se evita new Date().toISOString()
// porque usa UTC y puede adelantar el día en horas de la tarde/noche
// en husos horarios detrás de UTC (México), marcando encuestas como
// vencidas antes de tiempo.
const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Una encuesta es visible para el usuario si su asignación coincide por
// área o por nómina. Se compara todo como String para evitar errores
// entre números y texto.
const isAssignedToUser = (survey, user) => {

    const asignacion = survey?.asignacion;

    if (!asignacion || !asignacion.tipo) {
        return false;
    }

    const valores = Array.isArray(asignacion.valores)
        ? asignacion.valores.map(String)
        : [];

    if (asignacion.tipo === "area") {
        return valores.includes(String(user.area));
    }

    if (asignacion.tipo === "usuarios") {
        return valores.includes(String(user.nomina));
    }

    return false;
};

export function useOperatorSurveys() {

    const { user } = useAuth();

    const [rawSurveys, setRawSurveys] = useState([]);
    const [responsesById, setResponsesById] = useState(new Map());

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {

        if (!user?.nomina) return;

        setLoading(true);
        setError(null);

        try {

            // 1 consulta de encuestas + 1 consulta de respuestas del
            // usuario autenticado (nunca de otros usuarios).
            const [surveysData, responsesData] = await Promise.all([
                getOperatorSurveys(),
                getMyResponses(user.nomina)
            ]);

            setRawSurveys(surveysData);

            const map = new Map();

            responsesData.forEach(response => {
                if (response.idEncuesta) {
                    map.set(response.idEncuesta, response);
                }
            });

            setResponsesById(map);

        } catch (err) {

            if (import.meta.env.DEV) {
                console.error("Error cargando encuestas del operador:", err);
            }

            setError("No se pudieron cargar las encuestas. Intenta de nuevo más tarde.");

        } finally {

            setLoading(false);

        }

    }, [user?.nomina]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtrado por asignación + cruce con respuestas (en memoria, vía Map)
    // + cálculo de estadoActual/miPuntaje para cada encuesta visible.
    const surveys = useMemo(() => {

        if (!user) return [];

        const today = getTodayLocal();

        return rawSurveys

            .filter(survey => isAssignedToUser(survey, user))

            .map(survey => {

                const respuesta = responsesById.get(survey.id);

                if (respuesta) {
                    return {
                        ...survey,
                        estadoActual: "completada",
                        miPuntaje: respuesta.puntuacionObtenida
                    };
                }

                const vencida = Boolean(survey.fechaFin) && today > survey.fechaFin;

                return {
                    ...survey,
                    estadoActual: vencida ? "vencida" : "pendiente",
                    miPuntaje: null
                };

            });

    }, [rawSurveys, responsesById, user]);

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
