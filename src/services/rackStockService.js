import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { readCachedData, writeCachedData, clearCachedData } from "../utils/cacheStore";
import { actualizarRack } from "./rackService";

const call = (name) => httpsCallable(functions, name);

const crearStockFunction = call("crearStock");
const actualizarCantidadStockFunction = call("actualizarCantidadStock");
const eliminarStockFunction = call("eliminarStock");
const actualizarColorStockPorItemFunction = call("actualizarColorStockPorItem");
const obtenerStockPEPSFunction = call("obtenerStockPEPS");
const descontarStockPEPSFunction = call("descontarStockPEPS");
const trasladarStockPEPSFunction = call("trasladarStockPEPS");
const suscribirStockPorRackFunction = call("suscribirStockPorRack");
const suscribirStockFunction = call("suscribirStock");
const obtenerStockPorRackFunction = call("obtenerStockPorRack");
const refreshRackStockCachesFunction = call("refreshRackStockCaches");

const RACK_STOCK_CACHE_KEY = "sii-aqua-rack-stock-cache";

const getRackStockCacheKey = (rackId) =>
    rackId ? `${RACK_STOCK_CACHE_KEY}:${String(rackId)}` : RACK_STOCK_CACHE_KEY;

const formatStockData = (data = []) => {
    return [...(data || [])].sort((a, b) => {
        const fechaA = Number(a?.createdAt?.seconds || a?.fechaEntrada || 0);
        const fechaB = Number(b?.createdAt?.seconds || b?.fechaEntrada || 0);
        return fechaA - fechaB;
    });
};

const refreshRackStockCaches = async (rackId = null) => {
    const result = await refreshRackStockCachesFunction({ rackId });
    const stock = Array.isArray(result?.data?.stock) ? result.data.stock : [];

    writeCachedData(RACK_STOCK_CACHE_KEY, stock);

    if (rackId) {
        const rackStock = stock.filter(item => String(item.rackId) === String(rackId));
        writeCachedData(getRackStockCacheKey(rackId), rackStock);
    }

    return stock;
};
const normalizarTipo = (valor = "") => String(valor || "").toLowerCase().trim();

const obtenerCapacidadPorTipo = (rack = {}) => ({
    materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
    material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
    producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0)
});

const obtenerCapacidadTotalRack = (rack = {}) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    return Object.values(capacidadPorTipo).reduce((sum, valor) => sum + Number(valor || 0), 0);
};

export const obtenerEspacioDisponibleRack = ({ rack = {}, tipoItem = "", stockItems = [], cantidad = 0 }) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    const porcentajeOcupadoActual = Object.entries(capacidadPorTipo).reduce((sum, [tipo, capacidad]) => {
        if (!Number(capacidad || 0)) {
            return sum;
        }

        const stockTipo = (stockItems || [])
            .filter(item => normalizarTipo(item?.tipoItem) === normalizarTipo(tipo))
            .reduce((total, item) => total + Number(item?.cantidadActual || 0), 0);

        return sum + ((stockTipo / Number(capacidad)) * 100);
    }, 0);

    const porcentajeSolicitud = capacidadMaxima > 0 ? ((cantidadNumerica / capacidadMaxima) * 100) : 0;
    const porcentajeTotalFinal = porcentajeOcupadoActual + porcentajeSolicitud;
    const espacioLibre = capacidadMaxima > 0 ? Math.max(0, capacidadMaxima * (1 - (porcentajeOcupadoActual / 100))) : 0;
    const excedeCapacidad = capacidadMaxima > 0 && porcentajeTotalFinal > 100 + Number.EPSILON;

    return {
        tipo: tipoNormalizado,
        capacidadMaxima,
        stockActual: (stockItems || []).reduce((sum, item) => sum + Number(item?.cantidadActual || 0), 0),
        cantidadSolicitada: cantidadNumerica,
        espacioLibre,
        porcentajeActual: Number(porcentajeOcupadoActual.toFixed(2)),
        porcentajeTotal: Number((porcentajeTotalFinal).toFixed(2)),
        excedeCapacidad,
        mensaje: excedeCapacidad
            ? `No hay espacio suficiente en el rack. Se dispone de ${espacioLibre.toFixed()} unidades libres para ${tipoNormalizado.replace(/_/g, " ")}.`
            : ""
    };
};

export const validarCapacidadRack = ({ rack = {}, tipoItem = "", cantidad = 0, stockItems = [] }) => {
    const resumen = obtenerEspacioDisponibleRack({
        rack,
        tipoItem,
        stockItems,
        cantidad
    });

    return {
        ...resumen,
        valido: !resumen.excedeCapacidad
    };
};

const calcularPorcentajeMovimiento = (rack = {}, tipoItem = "", cantidad = 0) => {
    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    if (!capacidadMaxima || !cantidadNumerica) {
        return 0;
    }

    return Number(((cantidadNumerica / capacidadMaxima) * 100).toFixed(2));
};

export const actualizarOcupacionRack = async ({ rackId, rack, tipoItem = "", cantidad = 0, operacion = "sumar" }) => {
    if (!rackId || !rack) return;

    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const tipoNormalizado = normalizarTipo(tipoItem);
    const capacidadMaxima = Number(capacidadPorTipo[tipoNormalizado] || 0);
    const cantidadNumerica = Number(cantidad || 0);

    if (!capacidadMaxima || !cantidadNumerica) return;

    const porcentajeMovimiento = Number(((cantidadNumerica / capacidadMaxima) * 100).toFixed(2));
    const ocupacionActual = Number(rack?.espacioOcupado || 0);
    const ocupacionResultante = operacion === "restar"
        ? Math.max(0, ocupacionActual - porcentajeMovimiento)
        : Math.min(100, ocupacionActual + porcentajeMovimiento);

    await actualizarRack(rackId, {
        espacioOcupado: Number(ocupacionResultante.toFixed(2))
    });
};

export const actualizarOcupacionRackPorMovimientos = async ({ rackId, rack, movimientos = [], operacion = "sumar" }) => {
    if (!rackId || !rack) return;

    const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
    const porcentajeTotal = (movimientos || []).reduce((sum, mov) => {
        const tipo = normalizarTipo(mov?.tipoItem || "");
        const capacidad = Number(capacidadPorTipo[tipo] || 0);
        const cantidad = Number(mov?.cantidad || 0);

        if (!capacidad || !cantidad) return sum;

        return sum + ((cantidad / capacidad) * 100);
    }, 0);

    if (!porcentajeTotal) return;

    const ocupacionActual = Number(rack?.espacioOcupado || 0);
    const ocupacionResultante = operacion === "restar"
        ? Math.max(0, ocupacionActual - porcentajeTotal)
        : Math.min(100, ocupacionActual + porcentajeTotal);

    await actualizarRack(rackId, {
        espacioOcupado: Number(ocupacionResultante.toFixed(2))
    });
};

export const obtenerEstadoAsignacionRack = ({ rack, stockItems = [] }) => {
    const tipoAlmacenamiento = normalizarTipo(rack?.tipoAlmacenamiento);
    const stockActivo = (stockItems || []).filter(item => Number(item.cantidadActual || 0) > 0);

    if (stockActivo.length === 0) {
        if (tipoAlmacenamiento) {
            return tipoAlmacenamiento;
        }

        return rack?.tipoAsignacion || "";
    }

    const tiposLotes = [...new Set(stockActivo.map(item => normalizarTipo(item.tipoItem)))];

    if (tiposLotes.length === 0) {
        return tipoAlmacenamiento || rack?.tipoAsignacion || "";
    }

    const coincideTipo = tiposLotes.every(tipo => tipo === tipoAlmacenamiento);

    return coincideTipo ? "lote_en_uso" : "ubicacion_temporal";
};

export const actualizarAsignacionRackPorStock = async (rackId, rack, stockItems = []) => {
    if (!rackId) return;

    const estadoAsignacion = obtenerEstadoAsignacionRack({ rack, stockItems });

    if (!estadoAsignacion) return;

    await actualizarRack(rackId, {
        tipoAsignacion: estadoAsignacion
    });
};

/*
|--------------------------------------------------------------------------
| Crear stock
|--------------------------------------------------------------------------
*/

export const crearStock = async (data) => {
    const result = await crearStockFunction(data);
    const created = result?.data ?? null;

    if (data?.rackId) {
        const stockActual = await obtenerStockPorRack(data.rackId);
        writeCachedData(getRackStockCacheKey(data.rackId), stockActual);
    }

    clearCachedData(RACK_STOCK_CACHE_KEY);
    clearCachedData(getRackStockCacheKey(data?.rackId || "all"));
    return created;
};

export const actualizarCantidadStock = async (stockId, cantidadActual) => {
    const result = await actualizarCantidadStockFunction({ stockId, cantidadActual });
    const payload = result?.data ?? {};

    if (payload?.rackId) {
        clearCachedData(getRackStockCacheKey(payload.rackId));
    }

    clearCachedData(RACK_STOCK_CACHE_KEY);
    clearCachedData(getRackStockCacheKey(payload?.rackId || "all"));
    return payload;
};

export const eliminarStock = async (stockId) => {
    const result = await eliminarStockFunction({ stockId });
    const payload = result?.data ?? {};

    if (payload?.rackId) {
        clearCachedData(getRackStockCacheKey(payload.rackId));
    }

    clearCachedData(RACK_STOCK_CACHE_KEY);
    clearCachedData(getRackStockCacheKey(payload?.rackId || "all"));
    return payload;
};

export const actualizarColorStockPorItem = async (itemId, color) => {
    if (!itemId) return;

    const result = await actualizarColorStockPorItemFunction({ itemId, color });
    clearCachedData(RACK_STOCK_CACHE_KEY);
    return result?.data ?? null;
};

export const obtenerStockPEPS = async (rackId, itemId) => {
    const cacheKey = `${RACK_STOCK_CACHE_KEY}:peps:${String(rackId || "all")}:${String(itemId || "all")}`;
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await obtenerStockPEPSFunction({ rackId, itemId });
    const stock = Array.isArray(result?.data?.stock) ? result.data.stock : [];

    writeCachedData(cacheKey, stock);
    return stock;
};

export const descontarStockPEPS = async ({ rackId, itemId, cantidadSalida }) => {
    const result = await descontarStockPEPSFunction({ rackId, itemId, cantidadSalida });
    const movimientos = Array.isArray(result?.data?.movimientos) ? result.data.movimientos : [];

    if (rackId) {
        clearCachedData(getRackStockCacheKey(rackId));
        clearCachedData(`${RACK_STOCK_CACHE_KEY}:peps:${String(rackId || "all")}:${String(itemId || "all")}`);
    }

    clearCachedData(RACK_STOCK_CACHE_KEY);
    return movimientos;
};

export const trasladarStockPEPS = async ({ rackOrigen, rackDestino, itemId, cantidad, usuario }) => {
    const result = await trasladarStockPEPSFunction({ rackOrigen, rackDestino, itemId, cantidad, usuario });
    const movimientos = Array.isArray(result?.data?.movimientos) ? result.data.movimientos : [];

    if (rackOrigen?.id) {
        clearCachedData(getRackStockCacheKey(rackOrigen.id));
    }
    if (rackDestino?.id) {
        clearCachedData(getRackStockCacheKey(rackDestino.id));
    }

    clearCachedData(RACK_STOCK_CACHE_KEY);
    return movimientos;
};

export const suscribirStockPorRack = (rackId, callback) => {
    let isActive = true;

    suscribirStockPorRackFunction({ rackId })
        .then((result) => {
            if (!isActive) return;

            const data = Array.isArray(result?.data?.stock) ? result.data.stock : [];
            writeCachedData(getRackStockCacheKey(rackId), data);
            callback?.(data);
        })
        .catch((error) => {
            console.error("Error al suscribir stock por rack:", error);
            callback?.([]);
        });

    return () => {
        isActive = false;
    };
};

export const suscribirStock = (callback) => {
    let isActive = true;

    suscribirStockFunction()
        .then((result) => {
            if (!isActive) return;

            const stock = Array.isArray(result?.data?.stock) ? result.data.stock : [];
            writeCachedData(RACK_STOCK_CACHE_KEY, stock);
            callback?.(stock);
        })
        .catch((error) => {
            console.error("Error al suscribir stock:", error);
            callback?.([]);
        });

    return () => {
        isActive = false;
    };
};

export const obtenerStockPorRack = async (rackId) => {
    const cacheKey = getRackStockCacheKey(rackId);
    const cached = readCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await obtenerStockPorRackFunction({ rackId });
    const data = Array.isArray(result?.data?.stock) ? result.data.stock : [];

    writeCachedData(cacheKey, data);
    return data;
};