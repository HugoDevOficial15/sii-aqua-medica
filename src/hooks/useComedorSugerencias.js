import { useState, useCallback } from "react";

const EMULADOR_URL = "http://127.0.0.1:5001/aquamedica2023/us-central1";

export const useComedorSugerencias = (uid) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const guardarSugerencia = useCallback(
    async (texto, anonimo = false, foto = null) => {
      if (!uid) {
        setError("Usuario no autenticado");
        return false;
      }

      if (!texto || texto.trim().length === 0) {
        setError("La sugerencia no puede estar vacía");
        return false;
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const payload = {
          uid,
          texto: texto.trim(),
          anonimo,
          foto: foto || null,
          timestamp: new Date().toISOString(),
        };

        console.log("Guardando sugerencia:", payload);

        // Mock: simular éxito
        await new Promise((resolve) => setTimeout(resolve, 500));

        setSuccess(true);
        return true;
      } catch (err) {
        setError(err.message);
        console.error("Error en guardarSugerencia:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  const obtenerSugerencias = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${EMULADOR_URL}/obtenerSugerencias`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (data.status === "OK" && data.sugerencias) {
        setSugerencias(data.sugerencias);
        console.log("✓ Sugerencias obtenidas:", data.sugerencias);
        return true;
      } else {
        setError("Sin sugerencias disponibles");
        return false;
      }
    } catch (err) {
      const mensajeError = `Error al obtener sugerencias: ${err.message}`;
      setError(mensajeError);
      console.error(mensajeError);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sugerencias,
    guardarSugerencia,
    obtenerSugerencias,
    loading,
    error,
    success,
  };
};
