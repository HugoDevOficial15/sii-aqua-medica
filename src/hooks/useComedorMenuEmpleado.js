import { useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const EMULADOR_URL = "http://127.0.0.1:5001/aquamedica2023/us-central1";

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
      // 1. Obtener la nómina del usuario en la nueva colección 'users'
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || !userSnap.data().nomina) {
        setError("Perfil incompleto: No se encontró la nómina.");
        setLoading(false);
        return false;
      }

      const nominaUsuario = userSnap.data().nomina;

      // 2. Consumir la API usando la nómina
      const response = await fetch(`${EMULADOR_URL}/obtenerMenuEmpleado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            nomina: parseInt(nominaUsuario), 
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