import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { clearCachedData, readCachedData, writeCachedData } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);
const getOperadoresConductualesCallable = call("getOperadoresConductuales");
const getEvaluacionesConductualesCallable = call("getEvaluacionesConductuales");
const guardarEvaluacionConductualCallable = call("guardarEvaluacionConductual");

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

  const result = await getOperadoresConductualesCallable({ areaAdmin });
  const operadores = result?.data ?? [];
  writeCachedData(cacheKey, operadores, COMP_CONDUCTUAL_CACHE_TTL_MS);

  return operadores;
};

export const getEvaluacionesConductuales = async ({
  usuarioId,
  tipoReporte = "general",
  fechaInicio = "",
  fechaFin = "",
} = {}) => {
  if (!usuarioId) return [];

  const result = await getEvaluacionesConductualesCallable({
    usuarioId,
    tipoReporte,
    fechaInicio,
    fechaFin,
  });

  return Array.isArray(result?.data) ? result.data : [];
};

export const guardarEvaluacionConductual = async ({ usuarioId, evaluacion, anio } = {}) => {
  if (!usuarioId) {
    throw new Error("Falta el usuarioId para guardar la evaluación.");
  }

  const result = await guardarEvaluacionConductualCallable({ usuarioId, evaluacion, anio });
  return result?.data ?? null;
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

