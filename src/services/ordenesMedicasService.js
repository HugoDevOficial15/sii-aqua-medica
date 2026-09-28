import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

const call = (name) => httpsCallable(functions, name);

export const getMisOrdenesMedicas = async (userId) => {
  const result = await call("getMisOrdenesMedicas")({ userId });
  return result?.data?.ordenes ?? [];
};

export const createOrdenMedica = async (payload = {}) => {
  const result = await call("createOrdenMedica")(payload || {});
  return result?.data ?? { ok: true };
};

export const deleteOrdenMedica = async (id) => {
  const result = await call("deleteOrdenMedica")({ id });
  return result?.data ?? { ok: true };
};

export const getOrdenesMedicas = async () => {
  const result = await call("getOrdenesMedicas")();
  return result?.data?.ordenes ?? [];
};

export const buscarOrdenesActivasPorPaciente = async (termino) => {
  const result = await call("buscarOrdenesActivasPorPaciente")({ termino });
  return result?.data?.ordenes ?? [];
};

export const getUsuarioPorNomina = async (nomina) => {
  const result = await call("getUsuarioPorNomina")({ nomina });
  return result?.data?.usuario ?? null;
};

export const getUsuarioByDocId = async (docId) => {
  const result = await call("getUsuarioByDocId")({ docId });
  return result?.data?.usuario ?? null;
};

export const crearOrdenAtencionRapida = async (nominaAtencionRapida) => {
  const result = await call("crearOrdenAtencionRapida")({ nominaAtencionRapida });
  return result?.data ?? { ok: true, created: false };
};

export const guardarRevisionOrdenMedica = async (payload = {}) => {
  const result = await call("guardarRevisionOrdenMedica")(payload || {});
  return result?.data ?? { ok: true };
};

export const eliminarOrdenMedicaAdmin = async (ordenId) => {
  const result = await call("eliminarOrdenMedicaAdmin")({ ordenId });
  return result?.data ?? { ok: true };
};
