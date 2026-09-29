import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const getNoticiasFunction = httpsCallable(functions, "getNoticias");
const getNoticiasOperatorFunction = httpsCallable(functions, "getNoticiasOperator");
const createNoticiaFunction = httpsCallable(functions, "createNoticia");
const updateNoticiaFunction = httpsCallable(functions, "updateNoticia");
const deleteNoticiaFunction = httpsCallable(functions, "deleteNoticia");

export const getNoticias = async (filters = {}) => {
  const result = await getNoticiasFunction(filters || {});
  return result?.data?.noticias ?? [];
};

export const getOperatorNews = async (area = "") => {
  const result = await getNoticiasOperatorFunction({ area });
  return result?.data?.noticias ?? [];
};

export const createNoticia = async (payload = {}) => {
  const result = await createNoticiaFunction(payload || {});
  return result?.data || { ok: true };
};

export const updateNoticia = async (id, payload = {}) => {
  const result = await updateNoticiaFunction({ id, ...(payload || {}) });
  return result?.data || { ok: true };
};

export const deleteNoticia = async (id) => {
  const result = await deleteNoticiaFunction({ id });
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