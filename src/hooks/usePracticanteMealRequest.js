import { useState, useCallback } from "react";
import { COMEDOR_API } from "../config/comedorConfig";

export const usePracticanteMealRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const guardarSolicitudComida = useCallback(
    async (practicante, tipoComida, menuSeleccionado, extras = [], semana) => {
      if (!practicante || !semana) {
        setError("Faltan datos requeridos");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.GUARDAR_ORDEN}`;

        let desayunos, comidas, cenas;

        if (typeof menuSeleccionado === 'object' && menuSeleccionado.desayunos) {
          desayunos = menuSeleccionado.desayunos;
          comidas = menuSeleccionado.comidas;
          cenas = menuSeleccionado.cenas;
          console.log("📦 Guardando solicitud de practicante con arrays compilados:", { desayunos, comidas, cenas });
        } else {
          desayunos = Array(7).fill("NA");
          comidas = Array(7).fill("NA");
          cenas = Array(7).fill("NA");
          console.log("📝 Formato antiguo para practicante - no soportado");
          setError("Formato de datos no válido");
          return false;
        }

        const payload = {
          IDpracticante: practicante.nomina,
          IDdocF: semana,
          Nombre: practicante.nombre,
          Nomina: practicante.nomina,
          Area: practicante.area,
          Escuela: practicante.escuela,
          Desayuno: JSON.stringify(desayunos),
          Comida: JSON.stringify(comidas),
          Cena: JSON.stringify(cenas),
        };

        console.log("📤 Enviando payload a AquamedicaSoftware:", payload);

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Solicitud de practicante guardada en AquamedicaSoftware:", data);
        return true;
      } catch (err) {
        setError(err.message);
        console.error("❌ Error guardando solicitud de practicante:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    guardarSolicitudComida,
    loading,
    error,
  };
};
