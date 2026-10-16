import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { clearCachedByPrefix, getOrFetchCached } from "../utils/cacheStore";

const getNoticiasFunction = httpsCallable(functions, "getNoticias");
const getNoticiasOperatorFunction = httpsCallable(functions, "getNoticiasOperator");
const createNoticiaFunction = httpsCallable(functions, "createNoticia");
const updateNoticiaFunction = httpsCallable(functions, "updateNoticia");
const deleteNoticiaFunction = httpsCallable(functions, "deleteNoticia");

const NEWS_CACHE_PREFIX = "sii-aqua-noticias:";
const NEWS_CACHE_TTL_MS = 20 * 60 * 1000;

const invalidarNoticias = () => clearCachedByPrefix(NEWS_CACHE_PREFIX);

export const getNoticias = async (filters = {}) => {
  const key = `${NEWS_CACHE_PREFIX}admin:${JSON.stringify(filters || {})}`;
  return getOrFetchCached(key, async () => {
    const result = await getNoticiasFunction(filters || {});
    return result?.data?.noticias ?? [];
  }, NEWS_CACHE_TTL_MS);
};

export const getOperatorNews = async (area = "") => {
  const key = `${NEWS_CACHE_PREFIX}operador:${area || ""}`;
  return getOrFetchCached(key, async () => {
    const result = await getNoticiasOperatorFunction({ area });
    return result?.data?.noticias ?? [];
  }, NEWS_CACHE_TTL_MS);
};

export const createNoticia = async (payload = {}) => {
  const result = await createNoticiaFunction(payload || {});
  invalidarNoticias();
  return result?.data || { ok: true };
};

export const updateNoticia = async (id, payload = {}) => {
  const result = await updateNoticiaFunction({ id, ...(payload || {}) });
  invalidarNoticias();
  return result?.data || { ok: true };
};

export const deleteNoticia = async (id) => {
  const result = await deleteNoticiaFunction({ id });
  invalidarNoticias();
  return result?.data || { ok: true };
};

export const crearNoticia = async (titulo, contenido, archivoImagen) => {
  return createNoticia({
    titulo,
    contenido,
    imagen: archivoImagen?.url || "",
    archivo: "",
    archivoNombre: "",
    archivoRuta: "",
    fechaLimite: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    areaDestino: "Todas",
    estado: "Activa",
  });
};
