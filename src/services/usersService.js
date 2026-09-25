import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import {
  readSessionCache,
  writeSessionCache,
  writeMemoryCache,
  readMemoryCache,
  invalidateCacheGroup,
  readCachedData,
  writeCachedData,
} from "../utils/cacheStore";
import { AREAS } from "../catalogs/areas";
import { getPuestos } from "./puestos-service";

const USERS_CACHE_KEY = "sii-aqua-users-cache";
const INCAPACIDADES_CACHE_KEY = "sii-aqua-incapacidades-cache";
const DASHBOARD_CACHE_KEY = "sii-aqua-dashboard-stats";
const DASHBOARD_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USERS_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const USERS_SEARCH_CACHE_TTL_MS = 2 * 60 * 1000;

const call = (name) => httpsCallable(functions, name);
const getUsersFunction = call("getUsers");
const getUsersPageFunction = call("getUsersPage");
const searchUsersFunction = call("searchUsers");
const migrateUserSearchFieldsFunction = call("migrateUserSearchFields");
const getIncapacidadesFunction = call("getIncapacidadesByUsers");
const getIncapacidadesByUserFunction = call("getIncapacidadesByUser");

const readCacheItem = (key) => readMemoryCache(key) ?? readSessionCache(key);
const writeCacheItem = (key, data) => {
  writeMemoryCache(key, data);
  writeSessionCache(key, data);
};

export const invalidateUserAndPersonalCaches = () => {
  invalidateCacheGroup(
    USERS_CACHE_KEY,
    "sii-aqua-users-page:",
    "sii-aqua-users-search:",
    INCAPACIDADES_CACHE_KEY,
    "sii-aqua-users-page-data",
    "sii-aqua-personal-records:",
    "sii-aqua-personal-users:",
    DASHBOARD_CACHE_KEY,
    "sii-aqua-aniversarios-summary",
    "sii-aqua-aniversarios-by-month",
  );
};

export const buildDashboardStats = (users = []) => {
  const operadores = users.filter((user) => user.rol === "operador");
  const activos = operadores.filter((user) => user.activo === true);
  const bajas = operadores.filter((user) => user.activo === false || user.activo === "false");
  const usuariosPorArea = AREAS.map((area) => ({
    area: area.nombre,
    total: operadores.filter((user) => user.area === area.nombre).length,
  })).filter((area) => area.total > 0);

  return {
    totalOperadores: operadores.length,
    operadoresActivos: activos.length,
    operadoresBaja: bajas.length,
    operadoresHombres: activos.filter((user) => user.Genero === "H").length,
    operadoresMujeres: activos.filter((user) => user.Genero === "M").length,
    administradores: users.filter((user) => user.rol !== "operador").length,
    usuariosPorArea,
    porcentajeActivos: operadores.length ? ((activos.length / operadores.length) * 100).toFixed(0) : 0,
    porcentajeBajas: operadores.length ? ((bajas.length / operadores.length) * 100).toFixed(0) : 0,
    updatedAt: new Date().toISOString(),
  };
};
    
const getDashboardCacheKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return `${DASHBOARD_CACHE_KEY}-${user?.uid || "anonymous"}`;
  } catch {
    return DASHBOARD_CACHE_KEY;
  }
};

const getCurrentAdminArea = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return typeof user?.area === "string" ? user.area.trim() : user?.area || "";
  } catch {
    return "";
  }
};

export const getUsers = async ({ source = "cache", forceRefresh = false, areaAdmin = getCurrentAdminArea() } = {}) => {
  const cacheKey = `${USERS_CACHE_KEY}:${areaAdmin || "all"}`;
  if (!forceRefresh && source !== "server") {
    const cached = readCacheItem(cacheKey);
    if (cached) return cached;
  }
  const users = (await getUsersFunction({ areaAdmin })).data || [];
  writeCacheItem(cacheKey, users);
  return users;
};

export const getUsersPage = async ({ cursor = null, pageSize = 30, areaAdmin = getCurrentAdminArea() } = {}) => {
  const cacheKey = `sii-aqua-users-page:${areaAdmin || "all"}:${cursor ?? "first"}:${pageSize}`;
  const cached = readCachedData(cacheKey, USERS_PAGE_CACHE_TTL_MS);
  if (cached) return cached;

  const result = await getUsersPageFunction({ cursor, pageSize, areaAdmin });
  const page = result.data || { users: [], hasMore: false, nextCursor: null };
  writeCachedData(cacheKey, page, USERS_PAGE_CACHE_TTL_MS);
  return page;
};

export const searchUsers = async (search, areaAdmin = getCurrentAdminArea()) => {
  const normalizedSearch = String(search || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const cacheKey = `sii-aqua-users-search:${areaAdmin || "all"}:${normalizedSearch}`;
  const cached = readCachedData(cacheKey, USERS_SEARCH_CACHE_TTL_MS);
  if (cached) return cached;

  const result = await searchUsersFunction({ search, areaAdmin });
  const data = result.data || { users: [], hasMore: false, nextCursor: null };
  writeCachedData(cacheKey, data, USERS_SEARCH_CACHE_TTL_MS);
  return data;
};

export const migrateUserSearchFields = async () => {
  const result = await migrateUserSearchFieldsFunction();
  return result.data;
};

export const getActiveIncapacidad = (incapacidades = [], date = new Date()) => {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  return incapacidades.find((incapacidad) => {
    const start = incapacidad.fechaInicio ? new Date(`${incapacidad.fechaInicio}T00:00:00`) : null;
    const end = incapacidad.fechaFin ? new Date(`${incapacidad.fechaFin}T23:59:59`) : null;
    return (!start || start <= today) && (!end || end >= today);
  }) || null;
};

export const syncUsersWithIncapacidades = (users = [], incapacidadesByUser = {}) => users.map((user) => ({
  ...user,
  estado: getActiveIncapacidad(incapacidadesByUser[user.id] || []) ? "incapacidad" : "activo",
  activo: user.activo === false ? false : true,
}));

export const getIncapacidadesByUsers = async (userIds = [], usersData = []) => {
  if (!userIds.length) return {};
  const cached = readCacheItem(INCAPACIDADES_CACHE_KEY);
  if (cached && userIds.every((id) => Object.prototype.hasOwnProperty.call(cached, id))) return cached;
  const result = (await getIncapacidadesFunction({ userIds, usersData })).data || {};
  writeCacheItem(INCAPACIDADES_CACHE_KEY, result);
  return result;
};

export const getIncapacidadesByUser = async (userId, nomina = null) => {
  const result = await getIncapacidadesByUserFunction({ userId, nomina });
  return result.data || [];
};

export const getUsersPageData = async ({ forceRefresh = false } = {}) => {
  const key = "sii-aqua-users-page-data";
  const cached = forceRefresh ? null : readMemoryCache(key) ?? readSessionCache(key);
  if (cached) return cached;
  const [users, puestos] = await Promise.all([getUsers({ source: "server" }), getPuestos()]);
  const incapacidadesByUser = await getIncapacidadesByUsers(users.map((user) => user.id), users);
  const data = { users: syncUsersWithIncapacidades(users, incapacidadesByUser), puestos, incapacidadesByUser };
  writeMemoryCache(key, data);
  writeSessionCache(key, data);
  return data;
};

export const getDashboardStats = async ({ source = "cache" } = {}) => {
  const key = getDashboardCacheKey();
  if (source === "cache") return readCachedData(key, DASHBOARD_CACHE_TTL_MS);
  const stats = buildDashboardStats(await getUsers({ source: "server" }));
  writeCachedData(key, stats, DASHBOARD_CACHE_TTL_MS);
  return stats;
};

export const refreshDashboardStats = () => getDashboardStats({ source: "server" });
export const testDashboardSource = async () => null;

export const createUser = async (userData) => {
  const result = await call("createUser")(userData);
  invalidateUserAndPersonalCaches();
  return result.data;
};

export const updateUser = async (id, data) => {
  const result = await call("updateUser")({ id, data });
  invalidateUserAndPersonalCaches();
  return result.data;
};

export const updateUserPasswordByReset = async ({ userId, password, nomina }) => {
  const result = await call("updateUserPasswordByReset")({ userId, password, nomina });
  invalidateUserAndPersonalCaches();
  return result.data;
};

export const createIncapacidad = async (data) => {
  const result = await call("createIncapacidad")(data);
  invalidateUserAndPersonalCaches();
  return result.data;
};

export const updateUserFields = async (nomina, updates) => {
  const result = await call("updateUserFields")({ nomina, updates });
  invalidateUserAndPersonalCaches();
  return result.data;
};

export const updateUserFieldsByNomina = updateUserFields;

export const nominaExists = async (nomina, excludeId = null) => (await call("nominaExists")({ nomina, excludeId })).data;
export const findDuplicateNominas = async () => (await call("findDuplicateNominas")()).data;
export const findEmailNominaMismatch = async () => (await call("findEmailNominaMismatch")()).data;
export const fixEmailNominaMismatch = async (userId, correctNomina) => {
  const result = await call("fixEmailNominaMismatch")({ userId, correctNomina });
  invalidateUserAndPersonalCaches();
  return result.data;
};
export const resetFailedLoginAttempts = async (nominaValue) => (await call("resetFailedLoginAttempts")({ nominaValue })).data;
export const registerFailedLoginAttempt = async (nominaValue) => (await call("registerFailedLoginAttempt")({ nominaValue })).data;