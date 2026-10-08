import { useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { db } from "../config/firebase";
import { functions } from "../config/firebase";
import { COMEDOR_API } from "../config/comedorConfig";
import { useAuth } from "./useAuth";

export const useComedorOrdenes = (uid) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const guardarOrden = useCallback(
    async (tipoComida, menuSeleccionado, semana, dia, extras = []) => {
      if (!uid || !user) {
        setError("Usuario no autenticado");
        return false;
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.GUARDAR_ORDEN}`;

        // Si menuSeleccionado es un objeto con arrays (nuevo formato)
        let desayunos, comidas, cenas;

        if (typeof menuSeleccionado === 'object' && menuSeleccionado.desayunos) {
          // Usar arrays ya compilados
          desayunos = menuSeleccionado.desayunos;
          comidas = menuSeleccionado.comidas;
          cenas = menuSeleccionado.cenas;
          console.log(`📦 Usando arrays compilados:`, { desayunos, comidas, cenas });
        } else {
          // Formato antiguo: construir arrays para una sola orden
          const diasDeSemana = 7;
          desayunos = Array(diasDeSemana).fill("NA");
          comidas = Array(diasDeSemana).fill("NA");
          cenas = Array(diasDeSemana).fill("NA");

          const indiceActual = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].indexOf(dia);

          console.log(`📝 Asignando ${tipoComida} a ${dia} (índice ${indiceActual}): ${menuSeleccionado}`);

          if (tipoComida === "Desayuno") {
            desayunos[indiceActual] = menuSeleccionado;
            if (extras.length > 0) {
              desayunos[indiceActual] = `${menuSeleccionado}|${extras.join(",")}`;
            }
          } else if (tipoComida === "Comida") {
            comidas[indiceActual] = menuSeleccionado;
          } else if (tipoComida === "Cena") {
            cenas[indiceActual] = menuSeleccionado;
          }

          console.log(`✅ Arrays actuales:`, { desayunos, comidas, cenas });
        }

        // Estructura esperada por InDataMeal en aquamedica2023
        const payload = {
          IDoperador: user.nomina || user.id,
          IDdocF: semana, // Formato: "01.06.2026-07.06.2026"
          Nombre: user.nombre,
          Nomina: user.nomina,
          Area: user.area,
          Desayuno: JSON.stringify(desayunos),
          Comida: JSON.stringify(comidas),
          Cena: JSON.stringify(cenas),
        };


        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error al guardar orden: ${response.status}`);
        }

        // Guardar también en Firestore de sii-aqua-medica
        try {
          const saveComedorOrden = httpsCallable(functions, "saveComedorOrden");
          await saveComedorOrden({
            IDoperador: user.nomina || user.id,
            IDdocF: semana,
            Nombre: user.nombre,
            Nomina: user.nomina,
            Area: user.area,
            Desayuno: JSON.stringify(desayunos),
            Comida: JSON.stringify(comidas),
            Cena: JSON.stringify(cenas),
          });
          console.log("✓ Orden guardada en Firestore sii-aqua-medica");
        } catch (firestoreErr) {
          console.warn("⚠ Error guardando en Firestore local:", firestoreErr);
          // No lanzar error - la orden se guardó en AquamedicaSoftware
        }

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
    [uid, user]
  );

  const cancelarOrden = useCallback(
    async (semana, dia, tipoComida) => {
      if (!uid || !user) {
        setError("Usuario no autenticado");
        return false;
      }

      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.CANCELAR_ORDEN}`;

        // Construir arrays vacíos para cancelación (todos "NA")
        const diasDeSemana = 7;
        const desayunos = Array(diasDeSemana).fill("NA");
        const comidas = Array(diasDeSemana).fill("NA");
        const cenas = Array(diasDeSemana).fill("NA");

        // Asignar "NA" al índice del día a cancelar
        const indiceActual = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].indexOf(dia);

        if (tipoComida === "Desayuno") {
          desayunos[indiceActual] = "NA";
        } else if (tipoComida === "Comida") {
          comidas[indiceActual] = "NA";
        } else if (tipoComida === "Cena") {
          cenas[indiceActual] = "NA";
        }

        const payload = {
          IDoperador: user.nomina || user.id,
          IDdocF: semana,
          Nombre: user.nombre,
          Nomina: user.nomina,
          Area: user.area,
          Desayuno: JSON.stringify(desayunos),
          Comida: JSON.stringify(comidas),
          Cena: JSON.stringify(cenas),
        };

        console.log("📤 Payload cancelación enviando a CancelarComida:", payload);

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
    [uid, user]
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
