import { useState, useCallback } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { EXTRAS_PRECIOS } from "../config/comedorConfig";

export const usePracticanteMealRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const guardarSolicitudComida = useCallback(
    async (practicante, tipoComida, menuSeleccionado, extras = [], semana) => {
      if (!practicante || !tipoComida || !menuSeleccionado || !semana) {
        setError("Faltan datos requeridos");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Calcular total
        const costoComida = 25; // Desayuno y Comida cuestan $25
        const costoExtras = extras.reduce((total, extra) => {
          return total + (EXTRAS_PRECIOS[extra] || 0);
        }, 0);
        const total = costoComida + costoExtras;

        const solicitud = {
          // Datos del practicante
          nombrePracticante: practicante.nombre,
          nominaPracticante: practicante.nomina,
          areaPracticante: practicante.area,
          escuelaPracticante: practicante.escuela,

          // Solicitud
          tipoComida, // "Desayuno" o "Comida"
          menuSeleccionado,
          extras,
          semana,

          // Costos
          costoComida,
          costoExtras,
          total,

          // Metadata
          timestamp: serverTimestamp(),
          estado: "pendiente", // pendiente, confirmado, cancelado
        };

        // Guardar en colección "practicantes"
        const docRef = await addDoc(
          collection(db, "practicantes"),
          solicitud
        );

        console.log("✓ Solicitud guardada:", docRef.id);
        return true;
      } catch (err) {
        setError(err.message);
        console.error("Error guardando solicitud:", err);
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
