import { useState, useCallback } from "react";

// URL del emulador local
const EMULADOR_URL = "http://127.0.0.1:5001/aquamedica2023/us-central1";

export const useComedorCostos = () => {
  const [costos, setCostos] = useState([]);
  const [cancelaciones, setCancelaciones] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener costos de comedor por semana
  const obtenerCostosSemana = useCallback(async (idSemana) => {
    if (!idSemana || idSemana === "default") {
      setError("Selecciona una semana válida");
      return false;
    }

    setLoading(true);
    setError(null);
    setCostos([]);

    try {
      const response = await fetch(
        `${EMULADOR_URL}/obtenerCostosComedor`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idSemana }),
        }
      );

      const data = await response.json();

      if (data.status === "OK" && data.costos?.length > 0) {
        setCostos(data.costos);
        console.log("✓ Costos obtenidos:", data.costos);
        return true;
      } else {
        setError("Sin registros para esta semana");
        return false;
      }
    } catch (err) {
      const mensajeError = `Error al obtener costos: ${err.message}`;
      setError(mensajeError);
      console.error(mensajeError);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Calcular costos de una nómina en una semana
  const calcularCostos = useCallback(async (nomina, semana) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${EMULADOR_URL}/calcularCostos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomina, semana })
        }
      );

      const data = await response.json();

      if (data.status === "OK") {
        setCostos(data.costos);
        return data.costos;
      } else {
        throw new Error(data.mensaje || "Error desconocido");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error en calcularCostos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener nóminas con cancelaciones en una semana
  const getCancelacionesSemana = useCallback(async (semana) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${EMULADOR_URL}/getCancelacionesSemana`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semana })
        }
      );

      const data = await response.json();

      if (data.status === "OK") {
        setCancelaciones({
          nominasConCancelaciones: data.nominasConCancelaciones,
          total: data.total
        });
        return data.nominasConCancelaciones;
      } else {
        throw new Error(data.mensaje || "Error desconocido");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error en getCancelacionesSemana:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    costos,
    cancelaciones,
    loading,
    error,
    obtenerCostosSemana,
    calcularCostos,
    getCancelacionesSemana,
  };
};
