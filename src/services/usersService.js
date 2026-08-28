import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../config/firebase";

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
} from "firebase/firestore";

import { AREAS } from "../catalogs/areas";
import { createNotification } from "../utils/createNotification";
import { getPuestos } from "./puestos-service";

const userCollection = collection(db, "users");
const incapacidadesCollection = collection(db, "incapacidades");
const DASHBOARD_CACHE_KEY = "sii-aqua-dashboard-stats";

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
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getDashboardCacheKey(), JSON.stringify(stats));
  } catch (error) {
    console.warn("No se pudo guardar el cache del dashboard:", error);
  }
};

const readDashboardCache = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getDashboardCacheKey());
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
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
    console.log("[dashboard source test] requested=cache", {
      cacheExists: !!cached,
      sourceUsed: cached ? "localStorage" : "no cache",
      cacheKey: getDashboardCacheKey(),
    });

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

  console.log("[dashboard source test] requested=server", {
    sourceUsed: "Firestore server",
    cacheSaved: true,
    totalUsers: users.length,
    cacheKey: getDashboardCacheKey(),
  });

  return stats;
};

export const refreshDashboardStats = async () => {
  return getDashboardStats({ source: "server" });
};

export const testDashboardSource = async () => {
  const cached = readDashboardCache();
  const q = query(userCollection, orderBy("nomina", "asc"));
  const snapshot = await getDocs(q, { source: "server" });

  console.log("[dashboard source test] reload diagnostic", {
    cacheExists: !!cached,
    cacheKey: getDashboardCacheKey(),
    localStorageSource: cached ? "localStorage cache" : "no cache",
    firestoreFromCache: snapshot.metadata.fromCache,
    firebaseSource: snapshot.metadata.fromCache ? "cache" : "server",
    totalUsers: snapshot.docs.length,
  });

  return {
    cacheExists: !!cached,
    localStorageSource: cached ? "localStorage cache" : "no cache",
    firestoreFromCache: snapshot.metadata.fromCache,
    firebaseSource: snapshot.metadata.fromCache ? "cache" : "server",
    totalUsers: snapshot.docs.length,
  };
};

// Data Users
// Por defecto se usa caché local para evitar lecturas automáticas a Firestore.
// Solo se fuerza la lectura desde servidor cuando el cliente lo solicita explícitamente.
export const getUsers = async ({ source = "cache", forceRefresh = false } = {}) => {
  const resolvedSource = forceRefresh ? "server" : source;
  const q = query(userCollection, orderBy("nomina", "asc"));

  const snapshot = await getDocs(q, { source: resolvedSource });

  console.log("=== getUsers debug ===");
  console.log("source solicitado:", resolvedSource);
  console.log("fromCache:", snapshot.metadata.fromCache);
  console.log("hasPendingWrites:", snapshot.metadata.hasPendingWrites);
  console.log("cantidad:", snapshot.docs.length);

  const users = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return users;
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
    const activeIncapacidad = incapacidades.some((incapacidad) => {
      const fechaInicio = incapacidad?.fechaInicio
        ? new Date(`${incapacidad.fechaInicio}T00:00:00`)
        : null;
      const fechaFin = incapacidad?.fechaFin
        ? new Date(`${incapacidad.fechaFin}T23:59:59`)
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOk = !fechaInicio || fechaInicio <= today;
      const endOk = !fechaFin || fechaFin >= today;
      return startOk && endOk;
    });

    const currentState = String(user?.estado || "").trim().toLowerCase();
    const isExpiredIncapacidad = currentState === "incapacidad" && !activeIncapacidad;

    return {
      ...user,
      estado: activeIncapacidad
        ? "incapacidad"
        : isExpiredIncapacidad
          ? "activo"
          : user.estado,
      activo: user.activo === false ? false : true,
    };
  });
};

export const getUsersPageData = async () => {
  const [users, puestos] = await Promise.all([
    getUsers({ source: "server" }),
    getPuestos(),
  ]);

  const userIds = [...new Set(users.map((user) => user?.id).filter(Boolean))];
  const incapacidadesByUser = userIds.length
    ? await getIncapacidadesByUsers(userIds)
    : {};

  return {
    users: syncUsersWithIncapacidades(users, incapacidadesByUser),
    puestos,
    incapacidadesByUser,
  };
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
      mustChangePassword: true,
    });
  } catch (error) {
    console.log("Error creando usuario: ", error);
  }
};

// Update para incapacidades

export const updateUser = async (id, data) => {
  const ref = doc(db, "users", id);

  await updateDoc(ref, data);
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
    await updateDoc(doc(db, "users", userId), {
      estado: "incapacidad",
      tipoIncapacidad: normalizedTipo,
      fechaInicioIncapacidad: fechaInicio || null,
      fechaFinIncapacidad: fechaFin || null,
      notaIncapacidad: nota?.trim() || "",
      updatedAt: serverTimestamp(),
    });
  }

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

export const getIncapacidadesByUsers = async (userIds = []) => {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (!ids.length) {
    return {};
  }

  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }

  const results = {};

  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(incapacidadesCollection, where("userId", "in", chunk));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const userId = data.userId;

        if (!userId) return;

        if (!results[userId]) {
          results[userId] = [];
        }

        results[userId].push(data);
      });
    }),
  );

  Object.keys(results).forEach((userId) => {
    results[userId].sort((a, b) => {
      const aDate = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
      const bDate = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
      return bDate - aDate;
    });
  });

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
