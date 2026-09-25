const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, admin } = require("../../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { updateUserFieldsByNomina } = require("./updateUserFieldsService");

const usersCollection = db.collection("users");
const incapacidadesCollection = db.collection("incapacidades");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

const normalizeNomina = (value) => {
  const nomina = Number(value);
  if (!Number.isInteger(nomina) || nomina <= 0) throw new HttpsError("invalid-argument", "La nómina no es válida.");
  return nomina;
};

const normalizeSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const searchFields = (data = {}, nomina = data.nomina) => ({
  nombreBusqueda: normalizeSearchText(data.nombre),
  nominaBusqueda: nomina === undefined || nomina === null ? "" : String(nomina),
});

const userFromSnapshot = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const isHrodriguezIdentifier = (value = "") => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return false;

  const normalizedValue = rawValue.toLowerCase();
  const localPart = normalizedValue.split("@")[0] || "";

  return localPart === "hrodriguez"
    || normalizedValue === "hrodriguez@aquamedica.com"
    || normalizedValue === "hrodriguez@tubolsa.com";
};

const getAllowedIdentifier = (value) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;

  const normalizedValue = rawValue.toLowerCase();
  const localPart = normalizedValue.split("@")[0] || "";

  if (/^\d+$/.test(localPart)) return rawValue;
  if (isHrodriguezIdentifier(rawValue)) return rawValue;
  return null;
};

const findUserByIdentifier = async (identifier) => {
  const rawValue = String(identifier ?? "").trim();
  if (!rawValue) return null;

  const allowedIdentifier = getAllowedIdentifier(rawValue);
  if (!allowedIdentifier) return null;

  const normalizedValue = allowedIdentifier.toLowerCase();
  const numericValue = Number(allowedIdentifier);

  if (Number.isInteger(numericValue) && numericValue > 0) {
    const byNomina = await usersCollection.where("nomina", "==", numericValue).limit(1).get();
    if (!byNomina.empty) return byNomina.docs[0];
  }

  const byEmail = await usersCollection
    .where("email", "==", normalizedValue.endsWith("@aquamedica.com") ? normalizedValue : `${normalizedValue}@aquamedica.com`)
    .limit(1)
    .get();
  if (!byEmail.empty) return byEmail.docs[0];

  const byUsername = await usersCollection.where("username", "==", normalizedValue).limit(1).get();
  if (!byUsername.empty) return byUsername.docs[0];

  const byUsernameRaw = await usersCollection.where("username", "==", rawValue).limit(1).get();
  if (!byUsernameRaw.empty) return byUsernameRaw.docs[0];

  return null;
};

const normalizeUserRoleFilter = (filters = {}) => {
  const nextFilters = { ...filters };
  if (nextFilters.rol === undefined || nextFilters.rol === null || nextFilters.rol === "") {
    nextFilters.rol = "operador";
  }
  return nextFilters;
};

const applyUserFilters = (query, filters = {}) => {
  let nextQuery = query;
  const normalizedFilters = normalizeUserRoleFilter(filters);
  const { empresaId, rol, activo } = normalizedFilters;

  if (empresaId !== undefined && empresaId !== null && empresaId !== "") {
    nextQuery = nextQuery.where("empresaId", "==", String(empresaId));
  }

  if (rol !== undefined && rol !== null && rol !== "") {
    nextQuery = nextQuery.where("rol", "==", String(rol));
  }

  if (activo !== undefined && activo !== null && activo !== "") {
    nextQuery = nextQuery.where("activo", "==", activo === true || activo === "true");
  }

  return nextQuery;
};

const buildUsersPageQuery = ({ cursor = null, pageSize = 30, filters = {} } = {}) => {
  const limit = Math.min(Math.max(Number(pageSize || 30), 1), 60);
  let query = usersCollection.orderBy("nomina", "asc").limit(limit + 1);

  query = applyUserFilters(query, filters);

  if (cursor !== undefined && cursor !== null && cursor !== "") {
    query = query.startAfter(Number(cursor));
  }

  return query;
};

const sortIncapacidades = (items) => items.sort((a, b) =>
  String(b.fechaInicio || "").localeCompare(String(a.fechaInicio || "")));

const getUserByUidOrId = async (userId) => {
  const rawId = String(userId || "").trim();
  if (!rawId) return null;
  const byId = await usersCollection.doc(rawId).get();
  if (byId.exists) return byId;
  const byUid = await usersCollection.where("uid", "==", rawId).limit(1).get();
  return byUid.empty ? null : byUid.docs[0];
};

const getIncapacidadesMap = async (userIds = [], users = []) => {
  const requested = [...new Set(userIds.map(String))];
  if (!requested.length) return {};
  const usersByNomina = new Map(users.map((user) => [String(Number(user.nomina)), String(user.id)]));
  const result = {};
  const chunks = [];

  for (let index = 0; index < requested.length; index += 10) {
    chunks.push(requested.slice(index, index + 10));
  }

  const userIdSnapshots = await Promise.all(
    chunks.map((chunk) => incapacidadesCollection.where("userId", "in", chunk).get()),
  );
  const nominas = users
    .filter((user) => user?.nomina !== undefined && user?.nomina !== null && user?.nomina !== "")
    .map((user) => Number(user.nomina));
  const nominaSnapshots = [];

  for (let index = 0; index < nominas.length; index += 10) {
    nominaSnapshots.push(
      incapacidadesCollection.where("nomina", "in", nominas.slice(index, index + 10)).get(),
    );
  }

  const snapshots = await Promise.all([...userIdSnapshots, ...nominaSnapshots]);
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => {
    const data = { id: doc.id, ...doc.data() };
    const storedUserId = data.userId ? String(data.userId) : null;
    const resolvedId = storedUserId && requested.includes(storedUserId)
      ? storedUserId
      : usersByNomina.get(String(Number(data.nomina)));
    if (!resolvedId || !requested.has(resolvedId)) return;
    if (!result[resolvedId]) result[resolvedId] = [];
    if (!result[resolvedId].some((item) => item.id === data.id)) result[resolvedId].push(data);
  }));

  requested.forEach((id) => {
    result[id] = sortIncapacidades(result[id] || []);
  });
  return result;
};

const getIncapacidadesForUser = async (userSnapshot, nomina) => {
  const queries = [incapacidadesCollection.where("userId", "==", userSnapshot.id).get()];
  if (nomina !== undefined && nomina !== null && nomina !== "") {
    queries.push(incapacidadesCollection.where("nomina", "==", Number(nomina)).get());
  }

  const snapshots = await Promise.all(queries);
  const records = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => {
    records.set(doc.id, { id: doc.id, ...doc.data() });
  }));
  return sortIncapacidades([...records.values()]);
};

exports.getUsers = onCall(async (request) => {
  requireAuth(request);
  const data = request.data || {};
  const filters = normalizeUserRoleFilter({
    empresaId: data.empresaId,
    rol: data.rol,
    activo: data.activo,
  });

  const pageSize = data.pageSize !== undefined && data.pageSize !== null && data.pageSize !== ""
    ? Number(data.pageSize)
    : null;

  if (pageSize !== null) {
    const query = buildUsersPageQuery({ cursor: data.cursor, pageSize, filters });
    const snapshot = await query.get();
    const limit = Math.min(Math.max(pageSize, 1), 60);
    const hasMore = snapshot.docs.length > limit;
    const pageDocs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
    const users = pageDocs.map(userFromSnapshot);

    return {
      users,
      hasMore,
      nextCursor: hasMore ? users[users.length - 1]?.nomina ?? null : null,
    };
  }

  let query = usersCollection.orderBy("nomina", "asc");
  query = applyUserFilters(query, filters);
  const snapshot = await query.get();
  return snapshot.docs.map(userFromSnapshot);
});

exports.getUsersPage = onCall(async (request) => {
  requireAuth(request);
  const data = request.data || {};
  const filters = normalizeUserRoleFilter({
    empresaId: data.empresaId,
    rol: data.rol,
    activo: data.activo,
  });

  const query = buildUsersPageQuery({ cursor: data.cursor, pageSize: data.pageSize || 30, filters });
  const snapshot = await query.get();
  const pageSize = Math.min(Math.max(Number(data.pageSize || 30), 1), 60);
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  const users = pageDocs.map(userFromSnapshot);

  return {
    users,
    hasMore,
    nextCursor: hasMore ? users[users.length - 1]?.nomina ?? null : null,
  };
});

exports.searchUsers = onCall(async (request) => {
  requireAuth(request);
  const data = request.data || {};
  const search = normalizeSearchText(data.search);
  const filters = normalizeUserRoleFilter({
    empresaId: data.empresaId,
    rol: data.rol,
    activo: data.activo,
  });

  if (!search) {
    const query = buildUsersPageQuery({ cursor: data.cursor, pageSize: data.pageSize || 30, filters });
    const snapshot = await query.get();
    const pageSize = Math.min(Math.max(Number(data.pageSize || 30), 1), 60);
    const hasMore = snapshot.docs.length > pageSize;
    const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
    const users = pageDocs.map(userFromSnapshot);

    return { users, hasMore, nextCursor: hasMore ? users[users.length - 1]?.nomina ?? null : null };
  }

  const end = `${search}\uf8ff`;
  const queryBuilders = [
    usersCollection.where("nombreBusqueda", ">=", search).where("nombreBusqueda", "<=", end),
    usersCollection.where("nominaBusqueda", ">=", search).where("nominaBusqueda", "<=", end),
  ].map((query) => applyUserFilters(query, filters));

  const [nameSnapshot, nominaSnapshot] = await Promise.all(
    queryBuilders.map((query) => query.get()),
  );

  const records = new Map();
  [...nameSnapshot.docs, ...nominaSnapshot.docs].forEach((doc) => records.set(doc.id, userFromSnapshot(doc)));

  const users = [...records.values()]
    .sort((a, b) => Number(a.nomina) - Number(b.nomina));

  return { users, hasMore: false, nextCursor: null };
});

exports.createUser = onCall(async (request) => {
  requireAuth(request);
  const data = request.data || {};
  const nomina = normalizeNomina(data.nomina);
  const email = `${nomina}@aquamedica.com`;
  const password = `AQUAmedica${nomina}`;
  const duplicate = await usersCollection.where("nomina", "==", nomina).limit(1).get();
  if (!duplicate.empty) throw new HttpsError("already-exists", "Ya existe un usuario con esa nómina.");

  let authUser;
  try {
    authUser = await admin.auth().createUser({ email, password });
    const userRef = await usersCollection.add({
      ...data, ...searchFields(data, nomina), nomina, uid: authUser.uid, email, activo: true, estado: "activo", mustChangePassword: false,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: userRef.id, uid: authUser.uid, email, nomina };
  } catch (error) {
    if (authUser?.uid) await admin.auth().deleteUser(authUser.uid).catch(() => {});
    console.error("Error creando usuario:", error);
    throw new HttpsError("internal", "No se pudo crear el usuario.");
  }
});

exports.updateUser = onCall(async (request) => {
  requireAuth(request);
  const { id, data = {} } = request.data || {};
  if (!id || typeof data !== "object") throw new HttpsError("invalid-argument", "Usuario o datos inválidos.");
  const userSnapshot = await getUserByUidOrId(id);
  if (!userSnapshot) throw new HttpsError("not-found", "Usuario no encontrado.");
  const updates = { ...data, updatedAt: FieldValue.serverTimestamp() };
  if (Object.prototype.hasOwnProperty.call(updates, "nomina")) updates.nomina = normalizeNomina(updates.nomina);
  if (Object.prototype.hasOwnProperty.call(updates, "nombre") || Object.prototype.hasOwnProperty.call(updates, "nomina")) {
    Object.assign(updates, searchFields({ ...userSnapshot.data(), ...updates }, updates.nomina));
  }
  await userSnapshot.ref.update(updates);
  return { success: true, data: { ...userFromSnapshot(userSnapshot), ...data } };
});

exports.createIncapacidad = onCall(async (request) => {
  requireAuth(request);
  const data = request.data || {};
  const userSnapshot = await getUserByUidOrId(data.userId);
  if (!userSnapshot) throw new HttpsError("not-found", "Usuario no encontrado.");
  const tipo = data.tipo || "incapacidad";
  const payload = {
    userId: userSnapshot.id, nomina: data.nomina ? normalizeNomina(data.nomina) : null,
    nombre: data.nombre || "", genero: data.genero || "", area: data.area || "", empleadoArea: data.area || "",
    tipo, fechaInicio: data.fechaInicio || null, fechaFin: data.fechaFin || null, nota: String(data.nota || "").trim(),
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
  const incapacidadRef = incapacidadesCollection.doc();
  const yearRef = userSnapshot.ref.collection(String(new Date().getFullYear())).doc("informacion").collection("Incapacidades").doc();
  const batch = db.batch();
  batch.set(incapacidadRef, payload);
  batch.set(yearRef, { ...payload, id: yearRef.id });
  batch.update(userSnapshot.ref, {
    estado: "incapacidad", activo: true, tipoIncapacidad: tipo,
    fechaInicioIncapacidad: payload.fechaInicio, fechaFinIncapacidad: payload.fechaFin, notaIncapacidad: payload.nota,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { id: incapacidadRef.id, ...payload, createdAt: null, updatedAt: null };
});

exports.getIncapacidadesByUsers = onCall(async (request) => {
  requireAuth(request);
  const { userIds = [], usersData = [] } = request.data || {};
  return getIncapacidadesMap(userIds, usersData);
});

exports.getIncapacidadesByUser = onCall(async (request) => {
  requireAuth(request);
  const { userId, nomina } = request.data || {};
  const userSnapshot = await getUserByUidOrId(userId);
  if (!userSnapshot) throw new HttpsError("not-found", "Usuario no encontrado.");
  return getIncapacidadesForUser(userSnapshot, nomina);
});

exports.nominaExists = onCall(async (request) => {
  requireAuth(request);
  const { nomina, excludeId = null } = request.data || {};
  const snapshot = await usersCollection.where("nomina", "==", normalizeNomina(nomina)).get();
  return snapshot.docs.some((doc) => doc.id !== excludeId);
});

exports.findDuplicateNominas = onCall(async (request) => {
  requireAuth(request);
  const byNomina = new Map();
  const snapshot = await usersCollection.get();
  snapshot.docs.forEach((doc) => {
    const nomina = doc.data().nomina;
    if (nomina === undefined || nomina === null || nomina === "") return;
    if (!byNomina.has(nomina)) byNomina.set(nomina, []);
    byNomina.get(nomina).push(doc.id);
  });
  return [...byNomina.entries()].filter(([, ids]) => ids.length > 1)
    .map(([nomina, ids]) => ({ nomina, ids, count: ids.length })).sort((a, b) => a.nomina - b.nomina);
});

exports.findEmailNominaMismatch = onCall(async (request) => {
  requireAuth(request);
  const snapshot = await usersCollection.get();
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const nominaInEmail = Number(String(data.email || "").split("@")[0]);
    return Number.isNaN(nominaInEmail) || nominaInEmail === data.nomina ? [] : [{
      id: doc.id, email: data.email || "", nominaInFile: data.nomina, nominaInEmail, nombre: data.nombre,
    }];
  });
});

exports.fixEmailNominaMismatch = onCall(async (request) => {
  requireAuth(request);
  const { userId, correctNomina } = request.data || {};
  const ref = usersCollection.doc(String(userId));
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Usuario no encontrado.");
  const nomina = normalizeNomina(correctNomina);
  await ref.update({ nomina, ...searchFields((await ref.get()).data(), nomina), updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});

exports.updateUserFields = onCall(async (request) => {
  requireAuth(request);
  const { nomina, updates = {} } = request.data || {};
  return updateUserFieldsByNomina(nomina, updates);
});

exports.updateUserPasswordByReset = onCall(async (request) => {
  requireAuth(request);
  const { userId, password, nomina } = request.data || {};
  const userSnapshot = await getUserByUidOrId(userId);
  if (!userSnapshot) throw new HttpsError("not-found", "Usuario no encontrado.");

  const userData = userSnapshot.data() || {};
  const uid = userData.uid;
  if (!uid) throw new HttpsError("not-found", "No se encontró el UID del usuario.");

  const resetPassword = String(password || "").trim() || `AQUAmedica${userData.nomina ?? nomina ?? ""}`;
  if (!resetPassword) throw new HttpsError("invalid-argument", "La contraseña de reset no es válida.");

  await admin.auth().updateUser(uid, { password: resetPassword });
  await userSnapshot.ref.update({
    mustChangePassword: true,
    activo: true,
    bloqueado: false,
    intentosFallidos: 0,
    ultimoIntentoFallido: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, userId: userSnapshot.id, uid, password: resetPassword };
});

exports.resetFailedLoginAttempts = onCall(async (request) => {
  requireAuth(request);

  const rawIdentifier = getAllowedIdentifier(request.data?.nominaValue ?? request.data?.username ?? request.data?.identifier ?? request.data?.email);
  if (!rawIdentifier) return null;

  const user = await findUserByIdentifier(rawIdentifier);
  if (!user) return null;

  await user.ref.update({ activo: true, bloqueado: false, intentosFallidos: 0 });
  return userFromSnapshot(user);
});

exports.registerFailedLoginAttempt = onCall(async (request) => {
  const rawIdentifier = getAllowedIdentifier(request.data?.nominaValue ?? request.data?.username ?? request.data?.identifier ?? request.data?.email);
  if (!rawIdentifier) return { blocked: false, attempts: 0, userData: null };

  const user = await findUserByIdentifier(rawIdentifier);
  if (!user) return { blocked: false, attempts: 0, userData: null };

  const data = user.data();
  const attempts = Number(data.intentosFallidos || 0) + 1;
  const blocked = attempts >= 3;
  const updates = { intentosFallidos: attempts, ultimoIntentoFallido: FieldValue.serverTimestamp() };
  if (blocked) Object.assign(updates, { activo: false, bloqueado: true });
  await user.ref.update(updates);
  return { blocked, attempts, userData: { id: user.id, ...data, ...updates, ultimoIntentoFallido: null } };
});

exports.importEmployeeCSV = onCall(async (request) => {
  requireAuth(request);
  const start = Date.now();
  const rows = Array.isArray(request.data?.rows) ? request.data.rows : [];
  const summary = { updated: [], notFound: [], errors: [], skipped: [] };
  const snapshot = await usersCollection.get();
  const byNomina = new Map();

  snapshot.docs.forEach((doc) => {
    const nomina = doc.data().nomina;
    if (nomina === undefined || nomina === null) return;
    if (!byNomina.has(Number(nomina))) byNomina.set(Number(nomina), []);
    byNomina.get(Number(nomina)).push(doc.id);
  });

  let batch = db.batch();
  let operations = 0;
  const commitBatch = async () => {
    if (!operations) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  for (const row of rows) {
    try {
      const rawNomina = row.nomina ?? row.Nomina ?? row.NOMINA;
      if (rawNomina === undefined || rawNomina === null || String(rawNomina).trim() === "") {
        summary.skipped.push({ row, reason: "Fila sin nómina" });
        continue;
      }
      const nomina = Number(rawNomina);
      if (!Number.isInteger(nomina)) {
        summary.errors.push({ row, reason: "Nómina inválida" });
        continue;
      }
      const curp = String(row.curp ?? row.CURP ?? "").trim().toUpperCase();
      const rfc = String(row.rfc ?? row.RFC ?? "").trim().toUpperCase();
      const nss = String(row.nss ?? row.NSS ?? "").trim();
      if (!curp && !rfc && !nss) {
        summary.skipped.push({ row, reason: "Sin datos para actualizar" });
        continue;
      }
      const ids = byNomina.get(nomina) || [];
      if (!ids.length) {
        summary.notFound.push(nomina);
        continue;
      }
      if (ids.length > 1) {
        summary.errors.push({ row, reason: `Nómina ${nomina} duplicada, se omite` });
        continue;
      }
      const updates = {};
      if (curp) updates.curp = curp;
      if (rfc) updates.rfc = rfc;
      if (nss) updates.nss = nss;
      batch.update(usersCollection.doc(ids[0]), updates);
      operations++;
      summary.updated.push(nomina);
      if (operations >= 400) await commitBatch();
    } catch (error) {
      summary.errors.push({ row, reason: error.message || "Error desconocido" });
    }
  }
  await commitBatch();
  summary.totalMs = Date.now() - start;
  return summary;
});

exports.migrateUserSearchFields = onCall(async (request) => {
  requireAuth(request);
  const migrationRef = db.collection("system").doc("userSearchFields");
  const migrationSnapshot = await migrationRef.get();
  if (migrationSnapshot.data()?.complete === true) return { updated: 0, alreadyComplete: true };

  const snapshot = await usersCollection.get();
  let batch = db.batch();
  let operations = 0;
  let updated = 0;

  const commitBatch = async () => {
    if (!operations) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  for (const user of snapshot.docs) {
    batch.update(user.ref, searchFields(user.data()));
    operations++;
    updated++;
    if (operations === 400) await commitBatch();
  }
  await commitBatch();
  await migrationRef.set({ complete: true, updated, completedAt: FieldValue.serverTimestamp() });
  return { updated };
});