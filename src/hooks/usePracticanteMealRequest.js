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
        let registroCobros = {};

        if (typeof menuSeleccionado === 'object' && menuSeleccionado.desayunos) {
          desayunos = menuSeleccionado.desayunos;
          comidas = menuSeleccionado.comidas;
          cenas = menuSeleccionado.cenas;

          // Calcular cobro: SOLO desayuno O comida (no ambos)
          const costoDesayuno = desayunos.filter(d => d !== "NA").length * 25;
          const costoComida = comidas.filter(c => c !== "NA").length * 25;

          registroCobros = {
            tipoAlimento: costoDesayuno > 0 ? "Desayuno" : "Comida",
            cantidad: costoDesayuno > 0 ? desayunos.filter(d => d !== "NA").length : comidas.filter(c => c !== "NA").length,
            costoUnitario: 25,
            costoTotal: costoDesayuno > 0 ? costoDesayuno : costoComida,
            fechaCobro: new Date().toISOString(),
          };

          console.log("📦 Guardando solicitud de practicante con registro de cobros:", { desayunos, comidas, cenas, registroCobros });
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
          RegistroCobros: JSON.stringify(registroCobros),
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
