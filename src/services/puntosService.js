import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const call = (name) => httpsCallable(functions, name);

const adaptarFecha = (ms) => ({
  toDate: () => new Date(ms),
  toMillis: () => ms,
});

const adaptarItems = (items = []) =>
  items.map((item) => ({
    ...item,
    fechaCreacion: adaptarFecha(item.fechaCreacion || 0),
  }));

// Registrar puntos por una acción (lo calcula y guarda la Cloud Function "registrarPuntos")
export const registrarPuntos = async (userId, tipo, referencia) => {
  try {
    const result = await call("registrarPuntos")({ userId, tipo, referencia });
    return result.data?.ok === true;
  } catch (error) {
    console.error("Error al registrar puntos:", error);
    return false;
  }
};

export const obtenerPuntosUsuario = async (userId, anio) => {
  try {
    const result = await call("obtenerPuntosUsuario")({ userId, anio });
    return result.data || null;
  } catch (error) {
    console.error("Error al obtener información de puntos:", error);
    return null;
  }
};

export const obtenerHistorialPuntos = async (userId, limitNum = 10, anio) => {
  try {
    const result = await call("obtenerHistorialPuntos")({ userId, limitNum, anio });
    return adaptarItems(result.data?.items);
  } catch (error) {
    console.error("Error al obtener historial de puntos:", error);
    return [];
  }
};

export const obtenerUltimosLogros = async (userId, limitNum = 4, anio) => {
  try {
    const result = await call("obtenerUltimosLogros")({ userId, limitNum, anio });
    return adaptarItems(result.data?.items);
  } catch (error) {
    console.error("Error al obtener últimos logros:", error);
    return [];
  }
};

export const obtenerObjetivosCompletados = async (userId, anio) => {
  try {
    const result = await call("obtenerObjetivosCompletados")({ userId, anio });
    return result.data?.objetivos || {};
  } catch (error) {
    console.error("Error al obtener objetivos completados:", error);
    return {};
  }
};
