import { useState, useCallback } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { COMEDOR_API } from "../config/comedorConfig";

export const useComedorOrdenes = (uid) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const guardarOrden = useCallback(
    async (tipoComida, menuSeleccionado, semana, dia, extras = []) => {
      if (!uid) {
        setError("Usuario no autenticado");
        return false;
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.GUARDAR_ORDEN}`;

        // Estructura esperada por InDataMeal
        const payload = {
          uid,
          tipoComida, // "Desayuno", "Comida", "Cena"
          menu: menuSeleccionado, // El texto del menú
          semana,
          dia,
        };

        // Agregar extras solo si existen y es Desayuno
        if (extras.length > 0 && tipoComida === "Desayuno") {
          payload.extras = extras;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error al guardar orden: ${response.status}`);
        }

        const data = await response.json();
        setSuccess(true);
        return true;
      } catch (err) {
        setError(err.message);
        console.error("Error en guardarOrden:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  const cancelarOrden = useCallback(
    async (semana, dia, tipoComida) => {
      if (!uid) {
        setError("Usuario no autenticado");
        return false;
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.CANCELAR_ORDEN}`;

        const payload = {
          uid,
          semana,
          dia,
          tipoComida,
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error al cancelar orden: ${response.status}`);
        }

        setSuccess(true);
        return true;
      } catch (err) {
        setError(err.message);
        console.error("Error en cancelarOrden:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  const obtenerHistorial = useCallback(
    async (semanaAnterior = false) => {
      if (!uid) {
        setError("Usuario no autenticado");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.HISTORIAL}?uid=${uid}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Error al obtener historial: ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        setError(err.message);
        console.error("Error en obtenerHistorial:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  const verificarOrdenEnFirestore = useCallback(
    async (semana, dia, tipoComida) => {
      try {
        // Estructura: Agenda/{semana}/{dia}/DesayunoE/{uid}
        // donde: col/doc/col/doc/col/doc
        const tipoComidaKey = tipoComida + "E"; // DesayunoE, ComidaE, CenaE

        const docRefConE = doc(db, "Agenda", semana, dia, tipoComidaKey, uid);
        const docSnapConE = await getDoc(docRefConE);

        if (docSnapConE.exists()) {
          console.log(`✓ Orden guardada en: Agenda/${semana}/${dia}/${tipoComidaKey}/${uid}`);
          console.log("Datos:", docSnapConE.data());
          return docSnapConE.data();
        } else {
          // Intentar sin la "E" (para órdenes sin extras)
          const docRefSinE = doc(db, "Agenda", semana, dia, tipoComida, uid);
          const docSnapSinE = await getDoc(docRefSinE);

          if (docSnapSinE.exists()) {
            console.log(`✓ Orden guardada en: Agenda/${semana}/${dia}/${tipoComida}/${uid}`);
            console.log("Datos:", docSnapSinE.data());
            return docSnapSinE.data();
          } else {
            console.warn("✗ Orden no encontrada en Firestore");
            return null;
          }
        }
      } catch (err) {
        console.error("Error verificando orden:", err);
        return null;
      }
    },
    [uid]
  );

  return {
    guardarOrden,
    cancelarOrden,
    obtenerHistorial,
    verificarOrdenEnFirestore,
    loading,
    error,
    success,
  };
};
