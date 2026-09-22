import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import {
  readMemoryCache,
  readSessionCache,
  writeMemoryCache,
  writeSessionCache,
} from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const getPersonalUsersFunction = call("getPersonalUsers");
const getPersonalPageDataFunction = call("getPersonalPageData");
const getPersonalRecordsByUsersFunction = call("getPersonalRecordsByUsers");
const getPersonalPdfReportDataFunction = call("getPersonalPdfReportData");
const createPersonalReconocimientoFunction = call("createPersonalReconocimiento");
const createPersonalIncidenciaFunction = call("createPersonalIncidencia");
const createPersonalIncapacidadFunction = call("createPersonalIncapacidad");

const getCurrentUserCacheKey = (usuarioActual) => {
  if (!usuarioActual) return "sii-aqua-personal-users:anon";
  const uid = usuarioActual?.uid || usuarioActual?.id || usuarioActual?.nomina || "anon";
  return `sii-aqua-personal-users:${String(uid)}`;
};

export const getPersonalUsers = async ({ forceRefresh = false } = {}) => {
  const cacheKey = getCurrentUserCacheKey(JSON.parse(localStorage.getItem("user") || "null"));
  const cached = forceRefresh ? null : (readMemoryCache(cacheKey) ?? readSessionCache(cacheKey));
  if (Array.isArray(cached) && cached.length > 0) return cached;

  const result = await getPersonalUsersFunction();
  const users = result?.data || [];

  writeMemoryCache(cacheKey, users);
  writeSessionCache(cacheKey, users);
  return users;
};

export const getPersonalPageData = async () => {
  const result = await getPersonalPageDataFunction();
  return result?.data || {
    users: [],
    records: { reconocimientos: [], incidencias: [], incapacidades: [], historialesMedicos: [], capacitaciones: [] },
  };
};

export const getPersonalRecordsByUsers = async (users = []) => {
  const result = await getPersonalRecordsByUsersFunction({ users });
  return result?.data || {
    reconocimientos: [],
    incidencias: [],
    incapacidades: [],
    historialesMedicos: [],
    capacitaciones: [],
  };
};

export const getPersonalPdfReportData = async (payload = {}) => {
  const result = await getPersonalPdfReportDataFunction(payload);
  return result?.data || { users: [], records: [] };
};

export const createPersonalReconocimiento = async (payload = {}) => {
  const result = await createPersonalReconocimientoFunction(payload);
  invalidatePersonalCache();
  return result?.data || null;
};

export const createPersonalIncidencia = async (payload = {}) => {
  const result = await createPersonalIncidenciaFunction(payload);
  invalidatePersonalCache();
  return result?.data || null;
};

export const createPersonalIncapacidad = async (payload = {}) => {
  const result = await createPersonalIncapacidadFunction(payload);
  invalidatePersonalCache();
  return result?.data || null;
};

export const invalidatePersonalCache = () => {
  const userCachePrefix = "sii-aqua-personal-users:";

  try {
    Object.keys(localStorage).forEach((storageKey) => {
      if (storageKey.startsWith(userCachePrefix) || storageKey.startsWith("session-cache:sii-aqua-personal-users:")) {
        localStorage.removeItem(storageKey);
      }
    });
  } catch {
  }

  for (const key of Object.keys(window.localStorage || {})) {
    if (key.startsWith(userCachePrefix) || key.startsWith("session-cache:sii-aqua-personal-users:")) {
      writeMemoryCache(key.replace("session-cache:", ""), null);
    }
  }
};
