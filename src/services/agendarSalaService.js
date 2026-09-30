import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const callAgendaSalaFunction = (name) => httpsCallable(functions, name);

export const getAgendaSalas = async () => {
  const result = await callAgendaSalaFunction("getAgendaSalas")();
  return result?.data ?? [];
};

export const getAgendaSalasPorMes = async (anio, mes) => {
  const result = await callAgendaSalaFunction("getAgendaSalasPorMes")({ anio, mes });
  return result?.data ?? [];
};

export const crearAgendaSala = async (payload = {}) => {
  const result = await callAgendaSalaFunction("crearAgendaSala")(payload || {});
  return result?.data ?? null;
};

export const editarAgendaSala = async (id, payload = {}) => {
  const result = await callAgendaSalaFunction("editarAgendaSala")({ id, ...(payload || {}) });
  return result?.data ?? null;
};

export const eliminarAgendaSala = async (id) => {
  const result = await callAgendaSalaFunction("eliminarAgendaSala")({ id });
  return result?.data ?? { id, deleted: true };
};
