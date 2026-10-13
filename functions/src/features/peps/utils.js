const { HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const materiaPrimaCollection = db.collection("materia_prima");
const materialAcondicionamientoCollection = db.collection("material_acondicionamiento");
const productoTerminadoCollection = db.collection("producto_terminado");
const rackCollection = db.collection("racks");
const movimientoRackCollection = db.collection("movimientos");
const rackStockCollection = db.collection("rack_stock");

const itemCollections = {
  materia_prima: materiaPrimaCollection,
  material_acondicionamiento: materialAcondicionamientoCollection,
  producto_terminado: productoTerminadoCollection,
};

const getPayload = (request) => request?.data ?? {};

const validatePayload = (payload, fieldName = "datos") => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpsError("invalid-argument", `No se proporcionaron ${fieldName} válidos.`);
  }
  return payload;
};

const normalizeRackList = (racks = []) => {
  return [...racks].sort((a, b) => {
    const rackA = Number(a?.numeroRack || 0);
    const rackB = Number(b?.numeroRack || 0);
    if (rackA !== rackB) return rackA - rackB;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
};

const obtenerFechaOrden = (item = {}) => {
  const fechaEntrada = item?.fechaEntrada;
  if (fechaEntrada instanceof Date) return fechaEntrada.getTime();

  if (typeof fechaEntrada === "string" && fechaEntrada.trim()) {
    const fecha = new Date(fechaEntrada);
    if (!Number.isNaN(fecha.getTime())) return fecha.getTime();
  }

  const createdAt = item?.createdAt;
  if (createdAt && typeof createdAt.toDate === "function") {
    return createdAt.toDate().getTime();
  }

  const segundos = Number(createdAt?.seconds ?? createdAt?._seconds ?? 0);
  if (Number.isFinite(segundos)) return segundos * 1000;

  const fechaFallback = Date.parse(String(item?.fecha ?? ""));
  return Number.isNaN(fechaFallback) ? 0 : fechaFallback;
};

const formatStockData = (data = []) => {
  return [...(data || [])].sort((a, b) => obtenerFechaOrden(a) - obtenerFechaOrden(b));
};

const normalizarTipo = (valor = "") => String(valor || "").toLowerCase().trim();

const obtenerCapacidadPorTipo = (rack = {}) => ({
  materia_prima: Number(rack?.pesoMaximoMateriaPrima ?? rack?.["pesoMaximo-materiaPrima"] ?? 0),
  material_acondicionamiento: Number(rack?.pesoMaximoMaterialAcondicionamiento ?? rack?.["pesoMaximo-materialAcondicionamiento"] ?? 0),
  producto_terminado: Number(rack?.pesoMaximoProductoTerminado ?? rack?.["pesoMaximo-productoTerminado"] ?? 0),
});

const normalizarTexto = (valor) => (valor == null ? "" : String(valor).trim());
const normalizarCantidad = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : NaN;
};

const obtenerStockPorRackDb = async (rackId) => {
  if (!rackId) return [];

  const snap = await rackStockCollection
    .where("rackId", "==", rackId)
    .where("activo", "==", true)
    .get();

  return formatStockData(snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
};

const actualizarOcupacionRack = async ({ rackId, rack = {}, tipoItem = "", cantidad = 0, operacion = "sumar" }) => {
  if (!rackId || !rack || !tipoItem) return;

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

  await rackCollection.doc(rackId).update({
    espacioOcupado: Number(ocupacionResultante.toFixed(2)),
    fechaActualizacion: FieldValue.serverTimestamp(),
  });
};

const actualizarOcupacionRackPorMovimientos = async ({ rackId, rack = {}, movimientos = [], operacion = "sumar" }) => {
  if (!rackId || !rack || !Array.isArray(movimientos) || !movimientos.length) return;

  const capacidadPorTipo = obtenerCapacidadPorTipo(rack);
  const porcentajeTotal = movimientos.reduce((sum, mov) => {
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

  await rackCollection.doc(rackId).update({
    espacioOcupado: Number(ocupacionResultante.toFixed(2)),
    fechaActualizacion: FieldValue.serverTimestamp(),
  });
};

const obtenerEstadoAsignacionRack = ({ rack, stockItems = [] }) => {
  const tipoAlmacenamiento = normalizarTipo(rack?.tipoAlmacenamiento);
  const stockActivo = (stockItems || []).filter((item) => Number(item.cantidadActual || 0) > 0);

  if (stockActivo.length === 0) {
    return tipoAlmacenamiento || rack?.tipoAsignacion || "";
  }

  const tiposLotes = [...new Set(stockActivo.map((item) => normalizarTipo(item.tipoItem)))];

  if (tiposLotes.length === 0) {
    return tipoAlmacenamiento || rack?.tipoAsignacion || "";
  }

  const coincideTipo = tiposLotes.every((tipo) => tipo === tipoAlmacenamiento);
  return coincideTipo ? "lote_en_uso" : "ubicacion_temporal";
};

const actualizarAsignacionRackPorStock = async (rackId, rack, stockItems = []) => {
  if (!rackId) return;

  const estadoAsignacion = obtenerEstadoAsignacionRack({ rack, stockItems });
  if (!estadoAsignacion) return;

  await rackCollection.doc(rackId).update({
    tipoAsignacion: estadoAsignacion,
    fechaActualizacion: FieldValue.serverTimestamp(),
  });
};

module.exports = {
  db,
  FieldValue,
  HttpsError,
  materiaPrimaCollection,
  materialAcondicionamientoCollection,
  productoTerminadoCollection,
  rackCollection,
  movimientoRackCollection,
  rackStockCollection,
  itemCollections,
  getPayload,
  validatePayload,
  normalizeRackList,
  obtenerFechaOrden,
  formatStockData,
  normalizarTipo,
  obtenerCapacidadPorTipo,
  normalizarTexto,
  normalizarCantidad,
  obtenerStockPorRackDb,
  actualizarOcupacionRack,
  actualizarOcupacionRackPorMovimientos,
  obtenerEstadoAsignacionRack,
  actualizarAsignacionRackPorStock,
};
