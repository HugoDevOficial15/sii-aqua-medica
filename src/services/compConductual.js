import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { clearCachedData, readCachedData, writeCachedData } from "../utils/cacheStore";

const COMP_CONDUCTUAL_CACHE_PREFIX = "sii-aqua-comp-conductual-operadores";
const COMP_CONDUCTUAL_CACHE_TTL_MS = 30 * 60 * 1000;

const getOperadoresCacheKey = (areaAdmin = "") => {
  const area = String(areaAdmin || "general").trim().toLowerCase();
  return `${COMP_CONDUCTUAL_CACHE_PREFIX}:${area}`;
};

export const clearOperadoresConductualesCache = (areaAdmin = "") => {
  clearCachedData(getOperadoresCacheKey(areaAdmin));
};

export const getOperadoresConductuales = async (areaAdmin = "", { forceRefresh = false } = {}) => {
  const cacheKey = getOperadoresCacheKey(areaAdmin);

  if (!forceRefresh) {
    const cached = readCachedData(cacheKey, COMP_CONDUCTUAL_CACHE_TTL_MS);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
  }

  let usuariosQuery = query(collection(db, "users"), where("rol", "==", "operador"));

  if (areaAdmin) {
    usuariosQuery = query(usuariosQuery, where("area", "==", areaAdmin));
  }

  const snapshot = await getDocs(usuariosQuery);

  const operadores = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));

  const operadoresOrdenados = operadores.sort((a, b) => {
    const aNomina = Number(a?.nomina ?? 0);
    const bNomina = Number(b?.nomina ?? 0);

    if (Number.isNaN(aNomina) || Number.isNaN(bNomina)) {
      return String(a?.nomina ?? "").localeCompare(String(b?.nomina ?? ""));
    }

    return aNomina - bNomina;
  });

  writeCachedData(cacheKey, operadoresOrdenados, COMP_CONDUCTUAL_CACHE_TTL_MS);

  return operadoresOrdenados;
};

export const filtrarOperadoresConductuales = (operadores = [], texto = "") => {
  const termino = texto.trim().toLowerCase();

  if (!termino) {
    return operadores;
  }

  return operadores.filter((operador) => {
    const nomina = String(operador?.nomina ?? "").toLowerCase();
    const nombreCompleto = [
      operador?.nombre,
      operador?.Nombre,
      operador?.apellidoPaterno,
      operador?.apellidoMaterno,
      operador?.apellidos,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return nomina.includes(termino) || nombreCompleto.includes(termino);
  });
};

