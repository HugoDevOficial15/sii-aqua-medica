import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";

const call = (name) => httpsCallable(functions, name);

const crearProductoFunction = call("crearProducto");
const obtenerProductoFunction = call("obtenerProducto");
const actualizarProductoFunction = call("actualizarProducto");

const CACHE_KEY = "sii-aqua-productos-cache";

export const crearProducto = async (data) => {
    const result = await crearProductoFunction(data || {});
    clearCachedData(CACHE_KEY);
    return result?.data ?? null;
};

export const obtenerProducto = async () => {
    const cached = readCachedData(CACHE_KEY);
    if (cached) {
        return cached;
    }

    const result = await obtenerProductoFunction();
    const productos = Array.isArray(result?.data?.productoTerminado) ? result.data.productoTerminado : [];

    writeCachedData(CACHE_KEY, productos);
    return productos;
};

export const actualizarProducto = async (id, data) => {
    const result = await actualizarProductoFunction({ id, data });
    clearCachedData(CACHE_KEY);
    return result?.data ?? null;
};