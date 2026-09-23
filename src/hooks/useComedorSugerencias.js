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

  const normalizarSugerencia = (sug) => {
    return {
      ...sug,
      mensaje: sug.mensaje || sug.text || sug.Text || sug.texto || sug.Texto || sug.comentario || sug.Comentario || "",
      imagen: sug.imagen || sug.image || sug.foto || sug.Foto || sug.urlStorage || null,
      nombre: sug.nombre || sug.Nombre || "",
      fecha: sug.fecha || sug.Fecha || sug.DatePost || new Date().toISOString(),
      
      // SOLUCIÓN: Buscar 'Anonima' (con 'a') que es lo que devuelve el backend
      anonimo: sug.Anonima === true || sug.Anonima === "true" || sug.anonimo === true || sug.Anonimo === true,
    };
  };

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
        const sugerenciasNormalizadas = data.sugerencias.map(normalizarSugerencia);
        setSugerencias(sugerenciasNormalizadas);
        
        // Console log actualizado para leer la variable correcta de la API
        console.log("Verificación Anonima:", {
          original: data.sugerencias[0]?.Anonima, // Con 'a'
          normalizado: sugerenciasNormalizadas[0]?.anonimo,
          nombre: sugerenciasNormalizadas[0]?.nombre,
        });
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