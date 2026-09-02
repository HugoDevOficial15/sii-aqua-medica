import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";
import {
  readSessionCache,
  writeSessionCache,
  writeMemoryCache,
  readMemoryCache,
  clearCachedData,
  invalidateCacheGroup,
} from "../utils/cacheStore";

import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { AREAS } from "../catalogs/areas";
import { createNotification } from "../utils/createNotification";
import { readCachedData, writeCachedData } from "../utils/cacheStore";
import { getPuestos } from "./puestos-service";

const userCollection = collection(db, "users");
const incapacidadesCollection = collection(db, "incapacidades");
const DASHBOARD_CACHE_KEY = "sii-aqua-dashboard-stats";
const USERS_CACHE_KEY = "sii-aqua-users-cache";
const PUESTOS_CACHE_KEY = "sii-aqua-puestos-cache";
const INCAPACIDADES_CACHE_KEY = "sii-aqua-incapacidades-cache";
const CACHE_TTL_MS = 20 * 60 * 1000;

const readCacheItem = (key) => {
  return readMemoryCache(key) ?? readSessionCache(key);
};

const writeCacheItem = (key, data) => {
  writeMemoryCache(key, data);
  writeSessionCache(key, data);
};

const getDashboardCacheKey = () => {
  if (typeof window === "undefined") return DASHBOARD_CACHE_KEY;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const userId = user?.uid || "anonymous";
    return `${DASHBOARD_CACHE_KEY}-${userId}`;
  } catch (error) {
    return DASHBOARD_CACHE_KEY;
  }
};

const saveDashboardCache = (stats) => {
  writeSessionCache(getDashboardCacheKey(), stats);
};

const readDashboardCache = () => {
  return readSessionCache(getDashboardCacheKey());
};

const refreshUsersCacheSnapshot = async (userIds = []) => {
  const [users, puestos] = await Promise.all([
    getUsers({ source: "server" }),
    getPuestos(),
  ]);

  const activeUserIds = [...new Set([...userIds, ...users.map((user) => user?.id).filter(Boolean)])];
  const incapacidadesByUser = activeUserIds.length
    ? await getIncapacidadesByUsers(activeUserIds, users)
    : {};

  const pageData = {
    users: syncUsersWithIncapacidades(users, incapacidadesByUser),
    puestos,
    incapacidadesByUser,
  };

  writeCacheItem(USERS_CACHE_KEY, users);
  writeCacheItem(INCAPACIDADES_CACHE_KEY, incapacidadesByUser);
  writeMemoryCache("sii-aqua-users-page-data", pageData);
  writeSessionCache("sii-aqua-users-page-data", pageData);

  invalidateCacheGroup("sii-aqua-personal-records:");

  return pageData;
};

export const buildDashboardStats = (users = []) => {
  const operadores = users.filter((u) => u.rol === "operador");
  const activos = operadores.filter((u) => u.activo === true);
  const operadoresActivos = activos.length;
  const operadoresBaja = operadores.filter(
    (u) => u.activo === false || u.activo === "false",
  ).length;
  const totalOperadores = operadores.length;
  const operadoresHombres = activos.filter((u) => u.Genero === "H").length;
  const operadoresMujeres = activos.filter((u) => u.Genero === "M").length;
  const administradores = users.filter((u) => u.rol !== "operador").length;

  const usuariosPorArea = AREAS.map((area) => {
    const total = operadores.filter((u) => u.area === area.nombre).length;
    return { area: area.nombre, total };
  }).filter((a) => a.total > 0);

  return {
    totalOperadores,
    operadoresActivos,
    operadoresBaja,
    operadoresHombres,
    operadoresMujeres,
    administradores,
    usuariosPorArea,
    porcentajeActivos:
      totalOperadores > 0 ? ((operadoresActivos / totalOperadores) * 100).toFixed(0) : 0,
    porcentajeBajas:
      totalOperadores > 0 ? ((operadoresBaja / totalOperadores) * 100).toFixed(0) : 0,
    updatedAt: new Date().toISOString(),
  };
};

export const getDashboardStats = async ({ source = "cache" } = {}) => {
  if (source === "cache") {
    const cached = readDashboardCache();

    if (cached) {
      return cached;
    }

    return null;
  }

  const users = await getUsers({ source: "server" });
  const stats = buildDashboardStats(users);
  const dashboardRef = doc(db, "dashboard", "stats");

  await setDoc(dashboardRef, {
    ...stats,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  saveDashboardCache(stats);

  return stats;
};

export const refreshDashboardStats = async () => {
  return getDashboardStats({ source: "server" });
};

export const testDashboardSource = async () => {
  return null;
};

// Data Users
// Por defecto se usa caché local para evitar lecturas automáticas a Firestore.
// Solo se fuerza la lectura desde servidor cuando el cliente lo solicita explícitamente.
export const getUsers = async ({ source = "cache", forceRefresh = false } = {}) => {
  const resolvedSource = forceRefresh ? "server" : source;

  if (!forceRefresh && resolvedSource !== "server") {
    const cached = readCacheItem(USERS_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const q = query(userCollection, orderBy("nomina", "asc"));
  const snapshot = await getDocs(q, { source: resolvedSource });

  const users = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (!forceRefresh && resolvedSource !== "server") {
    writeCacheItem(USERS_CACHE_KEY, users);
  }

  return users;
};

export const getActiveIncapacidad = (incapacidades = [], date = new Date()) => {
  if (!Array.isArray(incapacidades) || !incapacidades.length) {
    return null;
  }

  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  return (
    incapacidades.find((incapacidad) => {
      const fechaInicio = incapacidad?.fechaInicio
        ? new Date(`${incapacidad.fechaInicio}T00:00:00`)
        : null;
      const fechaFin = incapacidad?.fechaFin
        ? new Date(`${incapacidad.fechaFin}T23:59:59`)
        : null;

      const startOk = !fechaInicio || fechaInicio <= today;
      const endOk = !fechaFin || fechaFin >= today;

      return startOk && endOk;
    }) || null
  );
};

export const syncUsersWithIncapacidades = (
  usersData = [],
  incapacidadesByUser = {},
) => {
  if (!Array.isArray(usersData) || usersData.length === 0) {
    return [];
  }

  return usersData.map((user) => {
    const incapacidades = incapacidadesByUser[user?.id] || [];
    const activeIncapacidad = getActiveIncapacidad(incapacidades);

    return {
      ...user,
      estado: activeIncapacidad ? "incapacidad" : "activo",
      activo: user.activo === false ? false : true,
    };
  });
};

export const getUsersPageData = async ({ forceRefresh = false } = {}) => {
  const CACHE_KEY = "sii-aqua-users-page-data";
  const cached = forceRefresh ? null : (readMemoryCache(CACHE_KEY) ?? readSessionCache(CACHE_KEY));

  if (cached) {
    return cached;
  }

  const [users, puestos] = await Promise.all([
    getUsers({ source: "server" }),
    getPuestos(),
  ]);

  const userIds = [...new Set(users.map((user) => user?.id).filter(Boolean))];
  const incapacidadesByUser = userIds.length
    ? await getIncapacidadesByUsers(userIds, users)
    : {};

  const data = {
    users: syncUsersWithIncapacidades(users, incapacidadesByUser),
    puestos,
    incapacidadesByUser,
  };

  writeMemoryCache(CACHE_KEY, data);
  writeSessionCache(CACHE_KEY, data);
  return data;
};

// Crear Usuario
export const createUser = async (userData) => {
  try {
    const email = `${userData.nomina}@aquamedica.com`;
    const password = `AQUAmedica${userData.nomina}`;

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const uid = userCredential.user.uid;

    await addDoc(userCollection, {
      ...userData,
      nomina: Number(userData.nomina),
      uid,
      email,
      activo: true,
      estado: "activo",
      mustChangePassword: false,
    });

    invalidateCacheGroup(
      "sii-aqua-users-cache",
      "sii-aqua-incapacidades-cache",
      "sii-aqua-users-page-data",
      "sii-aqua-personal-records:",
      "sii-aqua-dashboard-stats",
      "sii-aqua-aniversarios-summary",
      "sii-aqua-aniversarios-by-month",
    );
    await refreshUsersCacheSnapshot();
  } catch (error) {
    console.log("Error creando usuario: ", error);
  }
};

// Update para incapacidades

export const updateUser = async (id, data) => {
  const ref = doc(db, "users", id);

  await updateDoc(ref, data);
  invalidateCacheGroup(
    "sii-aqua-users-cache",
    "sii-aqua-incapacidades-cache",
    "sii-aqua-users-page-data",
    "sii-aqua-personal-records:",
    "sii-aqua-dashboard-stats",
    "sii-aqua-aniversarios-summary",
    "sii-aqua-aniversarios-by-month",
  );
  await refreshUsersCacheSnapshot([id]);
};

const resolveUserDocumentId = async (userId) => {
  if (!userId) return null;

  const rawUserId = String(userId).trim();
  if (!rawUserId) return null;

  try {
    const userQuery = query(userCollection, where("uid", "==", rawUserId));
    const snapshot = await getDocs(userQuery);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
  } catch (error) {
    console.error("Error resolviendo userDocId para incapacidad:", error);
  }

  return rawUserId;
};

export const createIncapacidad = async ({
  userId,
  nomina,
  nombre,
  genero,
  tipo,
  fechaInicio,
  fechaFin,
  nota,
  area,
}) => {
  const normalizedTipo = tipo || "incapacidad";
  const payload = {
    userId: userId || null,
    nomina: nomina ? Number(nomina) : null,
    nombre: nombre || "",
    genero: genero || "",
    area: area || "",
    empleadoArea: area || "",
    tipo: normalizedTipo,
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    nota: nota?.trim() || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(incapacidadesCollection, payload);

  if (userId) {
    const userDocId = await resolveUserDocumentId(userId);
    const anioActual = new Date().getFullYear();
    const userYearIncapacidadesCollection = collection(
      db,
      "users",
      String(userDocId),
      String(anioActual),
      "informacion",
      "Incapacidades"
    );
    const userYearIncapacidadRef = doc(userYearIncapacidadesCollection);
    const batch = writeBatch(db);

    batch.set(userYearIncapacidadRef, {
      ...payload,
      id: userYearIncapacidadRef.id,
      userId: userDocId || userId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, "users", String(userDocId)), {
      estado: "incapacidad",
      tipoIncapacidad: normalizedTipo,
      fechaInicioIncapacidad: fechaInicio || null,
      fechaFinIncapacidad: fechaFin || null,
      notaIncapacidad: nota?.trim() || "",
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  }

  invalidateCacheGroup(
    "sii-aqua-users-cache",
    "sii-aqua-incapacidades-cache",
    "sii-aqua-users-page-data",
    "sii-aqua-personal-records:",
    "sii-aqua-dashboard-stats",
  );
  await refreshUsersCacheSnapshot(userId ? [userId] : []);

  return { id: docRef.id, ...payload };
};

export const getIncapacidadesByUser = async (userId, nomina = null) => {
  if (!userId && (nomina === null || nomina === undefined || nomina === "")) {
    return [];
  }

  const queryFilters = [];

  if (userId) {
    queryFilters.push(where("userId", "==", userId));
  }

  if (nomina !== null && nomina !== undefined && nomina !== "") {
    queryFilters.push(where("nomina", "==", Number(nomina)));
  }

  const q = query(incapacidadesCollection, ...queryFilters);
  const snapshot = await getDocs(q);

  const incapacidades = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  return incapacidades.sort((a, b) => {
    const aDate = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
    const bDate = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
    return bDate - aDate;
  });
};

const BATCH_IN_QUERY_LIMIT = 10;

const chunkArray = (items = [], size = BATCH_IN_QUERY_LIMIT) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const getIncapacidadesByUsers = async (userIds = [], usersData = []) => {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (!ids.length) {
    return {};
  }

  const cached = readCacheItem(INCAPACIDADES_CACHE_KEY);
  if (cached) {
    const hasAllRequestedIds = ids.every((userId) => Object.prototype.hasOwnProperty.call(cached, userId));
    if (hasAllRequestedIds) {
      const filtered = {};
      ids.forEach((userId) => {
        if (cached[userId]) {
          filtered[userId] = cached[userId];
        }
      });
      return filtered;
    }
  }

  const usersByNomina = new Map();
  (Array.isArray(usersData) ? usersData : []).forEach((user) => {
    const nomina = user?.nomina;
    const userId = user?.id;
    if (userId && nomina !== undefined && nomina !== null && nomina !== "") {
      usersByNomina.set(String(Number(nomina)), userId);
    }
  });

  const nominaIds = [...new Set([...usersByNomina.keys()])];
  const queryGroups = chunkArray(ids, BATCH_IN_QUERY_LIMIT).map((batch) =>
    query(incapacidadesCollection, where("userId", "in", batch))
  );
  const nominaGroups = chunkArray(nominaIds, BATCH_IN_QUERY_LIMIT).map((batch) =>
    query(incapacidadesCollection, where("nomina", "in", batch.map((value) => Number(value))))
  );

  const snapshots = await Promise.all([
    ...queryGroups.map((q) => getDocs(q)),
    ...nominaGroups.map((q) => getDocs(q)),
  ]);

  const results = {};

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() };
      const userIdFromDoc = data.userId || null;
      const nominaFromDoc = data.nomina !== undefined && data.nomina !== null && data.nomina !== ""
        ? String(Number(data.nomina))
        : null;
      const resolvedUserId = userIdFromDoc || (nominaFromDoc ? usersByNomina.get(nominaFromDoc) : null);

      if (!resolvedUserId) return;

      if (!results[resolvedUserId]) {
        results[resolvedUserId] = [];
      }

      const existing = results[resolvedUserId];
      if (!existing.some((item) => item.id === data.id)) {
        existing.push(data);
      }
    });
  });

  ids.forEach((userId) => {
    if (!results[userId]) {
      results[userId] = [];
    }
  });

  Object.keys(results).forEach((userId) => {
    results[userId].sort((a, b) => {
      const aDate = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
      const bDate = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
      return bDate - aDate;
    });
  });

  writeCacheItem(INCAPACIDADES_CACHE_KEY, results);
  return results;
};

// Aplica cambios ya aprobados por un administrador a un usuario existente.
// Localiza el documento por número de nómina (nunca por uid) y aplica una
// actualización parcial (updateDoc, jamás addDoc/setDoc): esta es la ÚNICA
// función que debe escribir cambios de perfil sobre la colección "users".
// La usa solicitudesCambiosService.approveRequest(); nunca se llama directo
// desde el formulario de "Solicitar cambio" (eso ahora solo crea una
// solicitud pendiente, ver solicitudesCambiosService.requestProfileChange).
export const updateUserFields = async (nomina, updates) => {
  const q = query(userCollection, where("nomina", "==", Number(nomina)));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, error: "NOMINA_NOT_FOUND" };
  }

  if (snapshot.size > 1) {
    return { success: false, error: "DUPLICATE_NOMINA" };
  }

  const userDoc = snapshot.docs[0];
  const existingData = userDoc.data();

  await updateDoc(doc(db, "users", userDoc.id), updates);
  invalidateCacheGroup(
    "sii-aqua-users-cache",
    "sii-aqua-incapacidades-cache",
    "sii-aqua-users-page-data",
    "sii-aqua-personal-records:",
    "sii-aqua-dashboard-stats",
    "sii-aqua-aniversarios-summary",
    "sii-aqua-aniversarios-by-month",
  );
  await refreshUsersCacheSnapshot([userDoc.id]);

  return {
    success: true,
    data: { id: userDoc.id, ...existingData, ...updates },
  };
};

// Verifica si una nómina ya existe (usado antes de crear/editar en el
// panel de administración para impedir nóminas duplicadas). excludeId
// permite ignorar el propio documento cuando se está editando.
export const nominaExists = async (nomina, excludeId = null) => {
  const q = query(userCollection, where("nomina", "==", Number(nomina)));

  const snapshot = await getDocs(q);

  return snapshot.docs.some((d) => d.id !== excludeId);
};

// Herramienta de diagnóstico (solo lectura): recorre toda la colección y
// reporta nóminas repetidas, sin eliminar ni modificar nada.
export const findDuplicateNominas = async () => {
  const snapshot = await getDocs(userCollection);

  const byNomina = new Map();

  snapshot.docs.forEach((d) => {
    const nomina = d.data().nomina;

    if (nomina === undefined || nomina === null || nomina === "") return;

    if (!byNomina.has(nomina)) byNomina.set(nomina, []);

    byNomina.get(nomina).push(d.id);
  });

  const duplicates = [];

  byNomina.forEach((ids, nomina) => {
    if (ids.length > 1) {
      duplicates.push({ nomina, ids, count: ids.length });
    }
  });

  return duplicates.sort((a, b) => a.nomina - b.nomina);
};

// Diagnóstico: detecta usuarios cuya email no coincide con su nomina (puede
// indicar ediciones fallidas o corrupción de datos).
export const findEmailNominaMismatch = async () => {
  const snapshot = await getDocs(userCollection);
  const mismatches = [];

  snapshot.docs.forEach((d) => {
    const data = d.data();
    const email = data.email || "";
    const nomina = data.nomina;

    // Extrae la nómina esperada del email (ej: "104@aquamedica.com" → 104)
    const expectedNomina = parseInt(email.split("@")[0], 10);

    // Si la nómina en el email NO coincide con el campo nomina, hay un problema
    if (!Number.isNaN(expectedNomina) && expectedNomina !== nomina) {
      mismatches.push({
        id: d.id,
        email,
        nominaInFile: nomina,
        nominaInEmail: expectedNomina,
        nombre: data.nombre,
      });
    }
  });

  return mismatches;
};

// Herramienta para corregir usuarios cuya nomina no coincide con el email.
// Actualiza el campo nomina al valor extraído del email.
export const fixEmailNominaMismatch = async (userId, correctNomina) => {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { nomina: Number(correctNomina) });
};

export const resetFailedLoginAttempts = async (nominaValue) => {
  const nomina = String(nominaValue ?? "").trim();
  if (!nomina) return null;

  const email = `${nomina}@aquamedica.com`;
  const q = query(userCollection, where("email", "==", email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];

  await updateDoc(userDoc.ref, {
    activo: true,
    bloqueado: false,
    intentosFallidos: 0,
  });

  return { id: userDoc.id, ...userDoc.data() };
};

export const notifyAdminsSistemasUserBlocked = async (userData) => {
  const adminQuery = query(
    userCollection,
    where("rol", "==", "admin_sistemas"),
  );

  const snapshot = await getDocs(adminQuery);

  if (snapshot.empty) return [];

  const nombreUsuario =
    userData.nombre || userData.name || userData.username || "Usuario";
  const nominaUsuario = userData.nomina ?? userData.numeroNomina ?? "N/A";
  const motivoBloqueo =
    "Excedió el número máximo de intentos fallidos de acceso (3 intentos)";

  const notifications = await Promise.all(
    snapshot.docs.map(async (adminDoc) => {
      const admin = adminDoc.data();
      const adminId = admin.uid || adminDoc.id;
      const fallbackAdminId = adminDoc.id;

      if (!adminId && !fallbackAdminId) return null;

      const destinos = [admin.uid, adminDoc.id].filter(Boolean);

      return Promise.all(
        destinos.map(async (destino) =>
          createNotification({
            IdUsuario: destino,
            Titulo: "Cuenta bloqueada por intentos fallidos",
            Mensaje: `${nombreUsuario} - Nómina ${nominaUsuario} fue bloqueado por: ${motivoBloqueo}.`,
            Destino: "/usuarios",
            Accion: "usuario_bloqueado",
            extra: {
              tipo: "usuario_bloqueado",
              nombre: nombreUsuario,
              nomina: nominaUsuario,
              motivo: motivoBloqueo,
              motivoBloqueo,
              bloqueadoPor: "login",
              fechaBloqueo: serverTimestamp(),
            },
          }),
        ),
      );
    }),
  );

  return notifications.flat().filter(Boolean);
};

export const registerFailedLoginAttempt = async (nominaValue) => {
  const nomina = String(nominaValue ?? "").trim();
  if (!nomina) {
    return { blocked: false, attempts: 0, userData: null };
  }

  const email = `${nomina}@aquamedica.com`;
  const q = query(userCollection, where("email", "==", email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { blocked: false, attempts: 0, userData: null };
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  const currentAttempts = Number(userData.intentosFallidos || 0) + 1;
  const blocked = currentAttempts >= 3;

  const updates = {
    intentosFallidos: currentAttempts,
    ultimoIntentoFallido: serverTimestamp(),
  };

  if (blocked) {
    updates.activo = false;
    updates.bloqueado = true;
  }

  await updateDoc(userDoc.ref, updates);

  const updatedUser = { id: userDoc.id, ...userData, ...updates };

  if (blocked && userData.activo !== false) {
    await notifyAdminsSistemasUserBlocked(updatedUser);
  }

  return { blocked, attempts: currentAttempts, userData: updatedUser };
};

export const migrateNomina = async () => {
  const snapshot = await getDocs(userCollection);

  for (const d of snapshot.docs) {
    const data = d.data();

    await updateDoc(d.ref, {
      nomina: Number(data.nomina),
    });

    console.log("Actualizado:", d.id);
  }

  console.log("Migración completa 🚀");
};
