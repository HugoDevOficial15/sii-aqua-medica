const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const compConductualCollection = db.collection("users");

const normalizeText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const sortByName = (items = []) => [...items].sort((a, b) => {
  const nombreA = normalizeText(a?.nombre || a?.Nombre || "");
  const nombreB = normalizeText(b?.nombre || b?.Nombre || "");
  return nombreA.localeCompare(nombreB, "es", { sensitivity: "base" });
});

const getCompConductualResultsRef = (userId, year = String(new Date().getFullYear())) =>
  db.collection("users").doc(userId).collection(String(year)).doc("informacion").collection("resultados");

const filterEvaluacionesByDates = (registro, fechaInicio = "", fechaFin = "") => {
  const fechaValor = registro?.fechaElaboracion || registro?.fecha || registro?.createdAt;
  if (!fechaValor) return true;

  const fechaRegistro = typeof fechaValor?.toDate === "function"
    ? fechaValor.toDate()
    : new Date(fechaValor);

  if (Number.isNaN(fechaRegistro.getTime())) return true;
  if (fechaInicio && fechaRegistro < new Date(`${fechaInicio}T00:00:00`)) return false;
  if (fechaFin && fechaRegistro > new Date(`${fechaFin}T23:59:59`)) return false;

  return true;
};

exports.getOperadoresConductuales = onCall(async (request) => {
  const data = request?.data || {};
  const areaAdmin = normalizeText(data.areaAdmin, "");

  let query = compConductualCollection.where("rol", "==", "operador");

  if (areaAdmin) {
    query = query.where("area", "==", areaAdmin);
  }

  const snapshot = await query.get();
  const operadores = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  return sortByName(operadores);
});

exports.getEvaluacionesConductuales = onCall(async (request) => {
  const data = request?.data || {};
  const usuarioId = normalizeText(data.usuarioId, "");
  const tipoReporte = normalizeText(data.tipoReporte, "general");
  const fechaInicio = normalizeText(data.fechaInicio, "");
  const fechaFin = normalizeText(data.fechaFin, "");

  if (!usuarioId) {
    return [];
  }

  const anioActual = String(data.anio || new Date().getFullYear());
  const resultadosRef = getCompConductualResultsRef(usuarioId, anioActual);
  const snapshot = await resultadosRef.get();

  let registros = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  if (tipoReporte === "general") {
    registros = registros.filter((registro) =>
      registro?.tipo === "CompConductual" ||
      registro?.anio === anioActual ||
      registro?.id === "CompConductual",
    );
  }

  if (!registros.length && tipoReporte === "general") {
    const docRef = resultadosRef.doc("CompConductual");
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      registros = [{ id: docSnap.id, ...docSnap.data() }];
    }
  }

  if (tipoReporte === "general") {
    return registros.filter((registro) => filterEvaluacionesByDates(registro, fechaInicio, fechaFin));
  }

  return registros;
});

exports.guardarEvaluacionConductual = onCall(async (request) => {
  const data = request?.data || {};
  const usuarioId = normalizeText(data.usuarioId, "");
  const evaluacion = data.evaluacion || {};

  if (!usuarioId) {
    throw new HttpsError("invalid-argument", "Falta el usuarioId para guardar la evaluación.");
  }

  const anio = String(evaluacion.anio || data.anio || new Date().getFullYear());
  const resultadosRef = getCompConductualResultsRef(usuarioId, anio);
  const docRef = resultadosRef.doc();

  const documento = {
    ...evaluacion,
    id: docRef.id,
    usuarioId,
    anio,
    tipo: "CompConductual",
    createdAt: new Date(),
    fecha: new Date().toISOString(),
  };

  await docRef.set(documento);

  return documento;
});
