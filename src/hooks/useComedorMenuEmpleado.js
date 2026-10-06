import { useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const PRODUCCION_URL = "https://us-central1-aquamedica2023.cloudfunctions.net";

export const useComedorMenuEmpleado = (uid) => {
  const [menuEmpleado, setMenuEmpleado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const obtenerMenuEmpleado = useCallback(async (idSemana) => {
    if (!uid) {
      setError("Usuario no autenticado");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      let nominaUsuario = null;

      // Intentar obtener usuario de múltiples ubicaciones
      const possiblePaths = [
        { path: ["AquaMedica-Morelos", "Usuarios", "Comedor", uid], name: "AquaMedica-Morelos/Usuarios/Comedor" },
        { path: ["users", uid], name: "users" }
      ];

      for (const { path, name } of possiblePaths) {
        try {
          const userRef = doc(db, ...path);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            nominaUsuario = userData.Nomina || userData.nomina || userData.Numero || userData.numero;
            break;
          }
        } catch (e) {
          console.warn(`⚠ Error buscando en ${name}:`, e.message);
        }
      }

      // 2. Consumir la API usando la nómina
      const response = await fetch(`${PRODUCCION_URL}/obtenerMenuEmpleado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nomina: isNaN(parseInt(nominaUsuario)) ? nominaUsuario : parseInt(nominaUsuario),
            idSemana: idSemana
        }),
      });

      const data = await response.json();

      if (data.status === "OK" && data.existe) {
        setMenuEmpleado(data.menu);
        return true;
      } else {
        setError(data.message || "Sin menú disponible para esta semana");
        return false;
      }
    } catch (err) {
      setError(`Error de conexión con el servidor.`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [uid]);

  return {
    menuEmpleado,
    obtenerMenuEmpleado,
    loading,
    error,
  };
};