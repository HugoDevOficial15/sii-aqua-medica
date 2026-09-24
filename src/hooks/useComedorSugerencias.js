import { useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
// ¡Ruta corregida exactamente igual que en useComedorMenuEmpleado!
import { db } from "../config/firebase"; 

// Usando el emulador local para la prueba (cambiar por PRODUCCION_URL cuando despliegues)
const URL_BASE = "http://127.0.0.1:5001/aquamedica2023/us-central1";

export const useComedorSugerencias = (uid) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const normalizarSugerencia = (sug) => {
    return {
      ...sug,
      mensaje: sug.mensaje || sug.text || sug.Text || sug.texto || sug.Texto || sug.comentario || sug.Comentario || "",
      imagen: sug.imagen || sug.image || sug.foto || sug.Foto || sug.urlStorage || null,
      nombre: sug.nombre || sug.Nombre || "",
      fecha: sug.fecha || sug.Fecha || sug.DatePost || new Date().toISOString(),
      anonimo: sug.Anonima === true || sug.Anonima === "true" || sug.anonimo === true || sug.Anonimo === true,
      estado: sug.estado || "Pendiente",
      
      // NUEVO: Mapeo exacto basado en la base de datos de producción
      okRH: sug.OkRH === true || sug.okRH === true,
      comentarioRH: sug.CommentRH || sug.comentarioRH || "",
      fechaRH: sug.DateRevisionR || sug.fechaRH || null,
      
      okComedor: sug.OkComedor === true || sug.okComedor === true,
      comentarioComedor: sug.CommentComedor || sug.comentarioComedor || "",
      fechaComedor: sug.DateRevisionC || sug.fechaComedor || null
    };
  };

  const obtenerSugerencias = useCallback(async () => {
    if (!uid) return false;
    setLoading(true);
    setError(null);

    try {
      // 1. Obtenemos la nómina del usuario
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const nominaUsuario = userSnap.exists() ? userSnap.data().nomina : null;

      // 2. Llamamos a la función correcta (getUserRequests) enviando la nómina
      const response = await fetch(`${URL_BASE}/getUserRequests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          uid: uid,
          nomina: nominaUsuario ? parseInt(nominaUsuario) : null
        }),
      });

      const data = await response.json();

      // Ajustamos la validación. Si tu API devuelve 'data.data', cámbialo aquí.
      if (data.status === "OK" && data.sugerencias) {
        const sugerenciasNormalizadas = data.sugerencias.map(normalizarSugerencia);
        setSugerencias(sugerenciasNormalizadas);
        return true;
      } else {
        setError("Sin sugerencias disponibles");
        return false;
      }
    } catch (err) {
      console.error("Error en la petición:", err);
      setError(`Error al obtener sugerencias`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const guardarSugerencia = useCallback(
    async (texto, anonima = false, fotoUrl = null) => {
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
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || userSnap.data().nomina === undefined) {
          setError("No se pudo obtener el perfil del usuario.");
          setLoading(false);
          return false;
        }

        const nominaUsuario = userSnap.data().nomina;
        const nombreUsuario = userSnap.data().nombre;
        const response = await fetch(`${URL_BASE}/crearSugerencia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            texto: texto.trim(),
            anonima,
            fotoUrl,
            nomina: parseInt(nominaUsuario),
            nombre: nombreUsuario
          }),
        });

        const data = await response.json();

        if (data.status === "OK") {
          setSuccess(true);
          await obtenerSugerencias(); 
          return true;
        } else {
          setError(data.message || "Error al guardar en la base de datos");
          return false;
        }
      } catch (err) {
        setError("Error de conexión al enviar la sugerencia");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [uid, obtenerSugerencias]
  );

  return {
    sugerencias,
    guardarSugerencia,
    obtenerSugerencias,
    loading,
    error,
    success,
  };
};