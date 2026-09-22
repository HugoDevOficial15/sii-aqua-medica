import { useState, useEffect, useCallback } from "react";
import { COMEDOR_API, COMEDOR_COSTOS } from "../config/comedorConfig";

export const useComedorMenus = () => {
  const [menus, setMenus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const obtenerMenus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${COMEDOR_API.BASE_URL}${COMEDOR_API.ENDPOINTS.MENUS}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error al obtener menús: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "OK" && data.publicaciones.length > 0) {
        const publicacion = data.publicaciones[0];

        // Transformar datos para estructura uniforme
        const menusTransformados = {
          semana: publicacion.Fecha,
          id: publicacion.IdDoc,
          activa: publicacion.EstatusSemana,
          desayunos: publicacion.Desayuno,
          comidas: publicacion.Comida,
          cenas: publicacion.Cena,
          fechaPost: publicacion.DatePost,
        };

        setMenus(menusTransformados);
      } else {
        throw new Error("No hay menús disponibles");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error en useComedorMenus:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    obtenerMenus();
  }, [obtenerMenus]);

  // Obtener precio según tipo de comida
  const obtenerPrecio = (tipo) => {
    const precios = {
      Desayuno: COMEDOR_COSTOS.DESAYUNO,
      Comida: COMEDOR_COSTOS.COMIDA,
      Cena: COMEDOR_COSTOS.CENA,
    };
    return precios[tipo] || 0;
  };

  return {
    menus,
    loading,
    error,
    obtenerMenus,
    obtenerPrecio,
  };
};
