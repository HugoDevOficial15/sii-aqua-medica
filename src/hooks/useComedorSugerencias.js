import { useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const COMEDOR_API_URL = "https://us-central1-aquamedica2023.cloudfunctions.net";

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
      fecha:
        sug.fecha ||
        sug.Fecha ||
        sug.DatePost ||
        sug.fechaCreacion?.toDate?.() ||
        (sug.fechaCreacion?.seconds ? new Date(sug.fechaCreacion.seconds * 1000) : null) ||
        sug.createdAt?.toDate?.() ||
        new Date().toISOString(),
      anonimo: sug.Anonima === true || sug.Anonima === "true" || sug.anonimo === true || sug.Anonimo === true,
      estado: sug.estado || "Pendiente",
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
      const response = await fetch(`${COMEDOR_API_URL}/obtenerSugerencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!response.ok || result?.status !== "OK" || !Array.isArray(result?.sugerencias)) {
        throw new Error(result?.message || "No se pudieron cargar las sugerencias.");
      }

      const sugerenciasNormalizadas = result.sugerencias
        .map(normalizarSugerencia)
        .slice(0, 20);
      setSugerencias(sugerenciasNormalizadas);
      return true;
    } catch (err) {
      console.error("Error al obtener sugerencias:", err);
      setError("Error al conectar con el servidor.");
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

        const response = await fetch(`${COMEDOR_API_URL}/crearSugerencia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            texto: texto.trim(),
            anonima,
            fotoUrl,
            nomina: parseInt(nominaUsuario, 10),
            nombre: nombreUsuario,
          }),
        });
        const result = await response.json();

        if (!response.ok || result?.status !== "OK") {
          throw new Error(result?.message || "Error al guardar la sugerencia.");
        }

        setSuccess(true);
        await obtenerSugerencias();
        return true;
      } catch (err) {
        console.error("Error al guardar sugerencia:", err);
        setError("Error al guardar la sugerencia en la base de datos.");
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