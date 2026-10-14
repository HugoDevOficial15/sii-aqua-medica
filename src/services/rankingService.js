import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const call = (name) => httpsCallable(functions, name);

const SIN_POSICION = {
  posicionArea: 0,
  posicionGlobal: 0,
  totalEnArea: 0,
  nombreArea: "Sin Área",
  puntos: 0,
  nivel: "Bronce"
};

// TOP DE MI ÁREA (compañeros de trabajo)
export const obtenerTopArea = async (nombreArea, limitNum = 3) => {
  try {
    const result = await call("obtenerTopArea")({ nombreArea, limitNum });
    return result.data?.items || [];
  } catch (error) {
    console.error("Error al obtener top área:", error);
    return [];
  }
};

// TOP GLOBAL
export const obtenerTopGlobal = async (limitNum = 3) => {
  try {
    const result = await call("obtenerTopGlobal")({ limitNum });
    return result.data?.items || [];
  } catch (error) {
    console.error("Error al obtener top global:", error);
    return [];
  }
};

// Mi posición en el área
export const obtenerMiPosicionArea = async (userId) => {
  try {
    const result = await call("obtenerMiPosicionArea")({ userId });
    return result.data || SIN_POSICION;
  } catch (error) {
    return SIN_POSICION;
  }
};

// Todos los usuarios del área para comparativa
export const obtenerUsuariosArea = async (nombreArea) => {
  try {
    const result = await call("obtenerUsuariosArea")({ nombreArea });
    return result.data?.items || [];
  } catch (error) {
    console.error("Error al obtener users del área:", error);
    return [];
  }
};
