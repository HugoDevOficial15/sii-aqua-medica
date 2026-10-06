const { onCall, onRequest } = require("firebase-functions/v2/https");
const { admin, db } = require("../../config/firebase");

const usersCollection = db.collection("users");

const VALID_LOGIN_CUTOFF = new Date("2026-09-26T00:00:00.000Z");

const normalizeText = (value) => String(value ?? "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const parseDateValue = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value.seconds === "number") {
      const date = new Date(value.seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const safeDate = (value) => {
  const date = parseDateValue(value);
  return date ? date.toISOString() : null;
};

const isValidLoginDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return false;
  return date.getTime() >= VALID_LOGIN_CUTOFF.getTime();
};

const getUserLoginTimestamp = (userData = {}, authUser = null) => {
  const candidateFields = [
    userData.lastLoginAt,
    userData.lastLogin,
    userData.ultimoLogin,
    userData.ultimoAcceso,
    userData.loginAt,
    userData.fechaUltimoLogin,
    userData.lastSignInTime,
    userData.authLastLogin,
    userData.last_access,
  ];

  const validLoginDates = candidateFields
    .map((candidate) => parseDateValue(candidate))
    .filter((date) => date && isValidLoginDate(date));

  if (validLoginDates.length > 0) {
    const latestTimestamp = Math.max(...validLoginDates.map((date) => date.getTime()));
    return new Date(latestTimestamp).toISOString();
  }

  const authMetadata = authUser?.metadata || {};
  const signIn = safeDate(authMetadata.lastSignInTime || authMetadata.lastRefreshTime);
  const created = safeDate(authMetadata.creationTime);

  if (!signIn || !created) return null;

  const signInTime = new Date(signIn).getTime();
  const createdTime = new Date(created).getTime();

  if (signInTime < VALID_LOGIN_CUTOFF.getTime()) return null;
  return signInTime >= createdTime ? signIn : null;
};

const getAreaCandidates = (userData = {}) => [
  userData.area
].filter((value) => value !== undefined && value !== null && value !== "");

const matchesArea = (userData = {}, areaFilter = "") => {
  const normalizedArea = normalizeText(areaFilter);
  if (!normalizedArea) return true;

  return getAreaCandidates(userData).some((value) => {
    const normalizedValue = normalizeText(value);
    return normalizedValue === normalizedArea || normalizedValue.includes(normalizedArea);
  });
};

const buildUserReportItem = (userData = {}, authUser = null) => {
  const uid = userData.uid || userData.authUid || userData.userId || userData.uidAuth || null;
  const lastSignInTime = getUserLoginTimestamp(userData, authUser);

  return {
    uid: uid || authUser?.uid || null,
    id: userData.id || userData.uid || authUser?.uid || null,
    nombre: userData.nombre || userData.name || userData.displayName || null,
    email: userData.email || authUser?.email || null,
    nomina: userData.nomina ?? null,
    area: getAreaCandidates(userData)[0] || userData.area || null,
    activo: Boolean(userData.activo),
    ultimaSesion: lastSignInTime,
    seLogueo: Boolean(lastSignInTime),
  };
};

const getAuthUsersMap = async () => {
  const usersMap = new Map();
  let pageToken = undefined;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    for (const authUser of result.users) {
      usersMap.set(authUser.uid, authUser);
    }
    pageToken = result.pageToken;
  } while (pageToken);

  return usersMap;
};

const buildLoginReport = async (areaFilter = "") => {
  const snapshot = await usersCollection.get();
  const authUsersMap = await getAuthUsersMap();

  const matchingUsers = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((userData) => matchesArea(userData, areaFilter));

  const logueados = [];
  const sinLoguear = [];

  matchingUsers.forEach((userData) => {
    const authUser = authUsersMap.get(
      userData.uid || userData.authUid || userData.userId || userData.uidAuth || userData.id,
    ) || null;
    const reportItem = buildUserReportItem(userData, authUser);

    if (reportItem.seLogueo) {
      logueados.push(reportItem);
    } else {
      sinLoguear.push(reportItem);
    }
  });

  logueados.sort((a, b) => String(b.ultimaSesion || "").localeCompare(String(a.ultimaSesion || "")));
  sinLoguear.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

  return {
    area: areaFilter || "TODAS",
    fechaConsulta: new Date().toISOString(),
    totalUsuarios: matchingUsers.length,
    usuariosLogueados: logueados.length,
    usuariosSinLoguear: sinLoguear.length,
    usuarios: {
      logueados,
      sinLoguear,
    },
  };
};

const getRequestData = (request = {}) => {
  if (request?.data && typeof request.data === "object") {
    return request.data;
  }
  if (request?.body && typeof request.body === "object") {
    return request.body;
  }
  return {};
};

const getAreaFromRequest = (request = {}) => {
  const payload = getRequestData(request);
  const query = request?.query || {};
  return (
    payload.area
    || payload.areaId
    || payload.departamento
    || payload.departamentoId
    || query.area
    || query.areaId
    || query.departamento
    || query.departamentoId
    || ""
  );
};

exports.verificarUsuariosLogueados = onCall(async (request) => {
  const area = getAreaFromRequest(request);
  return buildLoginReport(area);
});

exports.verificarUsuariosLogueadosHttp = onRequest({ cors: true }, async (req, res) => {
  try {
    const area = getAreaFromRequest({ data: req.body, query: req.query });
    const report = await buildLoginReport(area);
    return res.status(200).json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al generar el reporte.";
    return res.status(500).json({
      ok: false,
      message,
      error: message,
    });
  }
});

exports.verificacionLogs = exports.verificarUsuariosLogueadosHttp;

module.exports = {
  verificarUsuariosLogueados: exports.verificarUsuariosLogueados,
  verificarUsuariosLogueadosHttp: exports.verificarUsuariosLogueadosHttp,
  verificacionLogs: exports.verificacionLogs,
};
