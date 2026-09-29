import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { readCachedData, writeCachedData } from "../utils/cacheStore";

const CACHE_KEY = "sii-aqua-medicamentos-cache";
const call = (name) => httpsCallable(functions, name);

const getMedicamentosFunction = call("getMedicamentos");
const createMedicamentoFunction = call("createMedicamento");
const updateMedicamentoFunction = call("updateMedicamento");
const toggleMedicamentoFunction = call("toggleMedicamento");
const deleteMedicamentoFunction = call("deleteMedicamento");

const invalidateMedicamentosCache = () => {
    writeCachedData(CACHE_KEY, null);
};

export const getMedicamentos = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const result = await getMedicamentosFunction();
    const medicamentos = Array.isArray(result?.data) ? result.data : [];

    writeCachedData(CACHE_KEY, medicamentos);
    return medicamentos;
};

export const createMedicamento = async (data) => {
    const result = await createMedicamentoFunction(data || {});
    invalidateMedicamentosCache();
    return result?.data ?? null;
};

export const updateMedicamento = async (id, data) => {
    const result = await updateMedicamentoFunction({ id, ...(data || {}) });
    invalidateMedicamentosCache();
    return result?.data ?? null;
};

export const toggleMedicamento = async (id, estado) => {
    const result = await toggleMedicamentoFunction({ id, estado });
    invalidateMedicamentosCache();
    return result?.data ?? null;
};

export const deleteMedicamento = async (id) => {
    const result = await deleteMedicamentoFunction({ id });
    invalidateMedicamentosCache();
    return result?.data ?? null;
};