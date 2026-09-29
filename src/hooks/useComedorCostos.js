import { useState, useCallback } from "react";

// URL de producción
const EMULADOR_URL = "https://us-central1-aquamedica2023.cloudfunctions.net";

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

  // Calcular costo 
  const calcularCosto = useCallback(async (nomina, idSemana) => {
    try {
        const response = await fetch(`${EMULADOR_URL}/calcularCostos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nomina, semana: idSemana })
        });

        const data = await response.json();

        if (data.status === "OK") {
            const nuevosCostos = data.costos;

            // ESTILO REACT: Actualizamos el array de "costos" en el estado 
            // buscando al empleado específico por su nómina para agregarle los cálculos.
            setCostos(prevCostos => prevCostos.map(empleado => 
                empleado.nomina === nomina 
                ? { 
                    ...empleado, 
                    calculoDesayuno: nuevosCostos.desayuno, 
                    calculoComida: nuevosCostos.comida, 
                    calculoCena: nuevosCostos.cena,
                    calculoExtras: nuevosCostos.extras,
                    calculoTotal: nuevosCostos.total
                  } 
                : empleado
            ));
            
            return true;
        } else {
            console.error("Error desde el servidor:", data.mensaje);
            return false;
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        return false;
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

  // Cancelar o eliminar una orden registrada
  const cancelarOrden = useCallback(async (nomina, semana) => {
    try {
      setLoading(true);
      // Aquí puedes implementar la llamada a tu función backend de cancelación (ej. CancelarComida)
      const response = await fetch(`${EMULADOR_URL}/CancelarComida`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomina, semana })
      });

      const data = await response.json();
      if (data.status === "OK" || response.ok) {
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error al cancelar orden:", err);
      return false;
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
    calcularCosto, // Corregido: sin la "s" final
    getCancelacionesSemana,
  };
};