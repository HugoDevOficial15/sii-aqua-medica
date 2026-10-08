import { useState, useCallback } from "react";
import { COMEDOR_API } from "../config/comedorConfig";

export const useComedorCostos = () => {
  const [costos, setCostos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const obtenerCostos = useCallback(async (semana) => {
    if (!semana) {
      setError("Semana es requerida");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.COSTOS}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSemana: semana }),
      });

      if (!response.ok) {
        throw new Error(`Error al obtener costos: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error(data.message || "Error al obtener costos");
      }

      setCostos(data);
      console.log("✅ Costos obtenidos:", data);
      return true;
    } catch (err) {
      setError(err.message);
      console.error("Error en obtenerCostos:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    costos,
    obtenerCostos,
    loading,
    error,
  };
};
