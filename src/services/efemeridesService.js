import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { clearCachedByPrefix, getOrFetchCached } from "../utils/cacheStore";

const getEfemeridesFunction = httpsCallable(functions, "getEfemerides");
const createEfemerideFunction = httpsCallable(functions, "createEfemeride");
const updateEfemerideFunction = httpsCallable(functions, "updateEfemeride");
const deleteEfemerideFunction = httpsCallable(functions, "deleteEfemeride");

// La vigencia y la fecha de publicación cambian por día: caché corta
const EFEMERIDES_CACHE_PREFIX = "sii-aqua-efemerides:";
const EFEMERIDES_CACHE_TTL_MS = 5 * 60 * 1000;

const invalidarEfemerides = () => clearCachedByPrefix(EFEMERIDES_CACHE_PREFIX);

export const getEfemerides = async (filters = {}) => {
  const key = `${EFEMERIDES_CACHE_PREFIX}${JSON.stringify(filters || {})}`;
  return getOrFetchCached(key, async () => {
    const result = await getEfemeridesFunction(filters || {});
    return result?.data?.efemerides ?? [];
  }, EFEMERIDES_CACHE_TTL_MS);
};

export const createEfemeride = async (payload = {}) => {
  const result = await createEfemerideFunction(payload || {});
  invalidarEfemerides();
  return result?.data || { ok: true };
};

export const updateEfemeride = async (id, payload = {}) => {
  const result = await updateEfemerideFunction({ id, ...(payload || {}) });
  invalidarEfemerides();
  return result?.data || { ok: true };
};

export const deleteEfemeride = async (id) => {
  const result = await deleteEfemerideFunction({ id });
  invalidarEfemerides();
  return result?.data || { ok: true };
};
