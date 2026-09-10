import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../config/firebase";

// Resolver el documentId del usuario a partir del firebaseUid
const resolveUserDocIdByFirebaseUid = async (firebaseUid) => {
  if (!firebaseUid) return null;
  try {
    const q = query(collection(db, "users"), where("uid", "==", firebaseUid));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].id;
  } catch (error) {
    return null;
  }
};

const obtenerAñoActual = () => new Date().getFullYear().toString();

// Cache con TTL para ranking
const RANKING_CACHE_TTL = 60 * 1000; // 1 minuto
const rankingCache = new Map();

const getCacheRanking = (key) => {
  const cached = rankingCache.get(key);
  if (!cached) return null;

  const ahora = Date.now();
  if (ahora - cached.timestamp > RANKING_CACHE_TTL) {
    rankingCache.delete(key);
    return null;
  }

  return cached.data;
};

const setCacheRanking = (key, data) => {
  rankingCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

export const limpiarCacheRanking = () => {
  rankingCache.clear();
};

export const actualizarRankingConArea = async (userId, año = obtenerAñoActual()) => {
  try {
    // 1. Obtener datos del usuario
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    const { nombreArea, area, equipo, nombre } = userData;

    // Usar nombreArea si existe, si no usar area como fallback
    const areaFinal = nombreArea || area;

    // Si no hay área, no se puede calcular ranking
    if (!areaFinal) {
      return null;
    }

    // 2. Obtener puntos del usuario
    const puntosRef = doc(collection(db, "users", userId, año, "informacion", "puntos_general"), "general");
    const puntosSnap = await getDoc(puntosRef);

    if (!puntosSnap.exists()) {
      return null;
    }

    const { total: puntos, nivel } = puntosSnap.data();

    // 3. Calcular RANKING GLOBAL
    const allUsersSnap = await getDocs(collection(db, "rankings_users"));
    const todosUsuarios = allUsersSnap.docs.map(doc => ({
      uid: doc.id,
      puntos: doc.data().puntos || 0,
      area: doc.data().area || doc.data().nombreArea
    }));

    const usuariosParaRanking = [
      ...todosUsuarios.filter(usuario => usuario.uid !== userId),
      { uid: userId, puntos: puntos || 0, area: areaFinal }
    ];

    const usersOrdenadosGlobal = usuariosParaRanking
      .sort((a, b) => b.puntos - a.puntos);

    const posicionGlobal = usersOrdenadosGlobal
      .findIndex(u => u.uid === userId) + 1;

    // 4. Calcular RANKING DE ÁREA (COMPAÑEROS)
    const usersArea = usuariosParaRanking.filter(u => u.area === areaFinal);
    const usersAreaOrdenados = usersArea
      .sort((a, b) => b.puntos - a.puntos);

    const posicionArea = usersAreaOrdenados
      .findIndex(u => u.uid === userId) + 1;

    const totalEnArea = usersArea.length;

    // 5. Actualizar documento de ranking
    await setDoc(
      doc(db, "rankings_users", userId),
      {
        uid: userId,
        nombre,
        puntos,
        nivel,
        area: areaFinal,
        nombreArea: areaFinal,
        equipo,
        posicionGlobal,
        posicionArea,
        totalEnArea,
        actualizadoEn: serverTimestamp()
      },
      { merge: true }
    );

    // Limpiar cache de ranking cuando se actualiza
    limpiarCacheRanking();

    return { posicionGlobal, posicionArea, totalEnArea, nombreArea };
  } catch (error) {
    return null;
  }
};

// TOP 3 DE MI ÁREA (compañeros de trabajo)
export const obtenerTopArea = async (nombreArea, limitNum = 3) => {
  try {
    const cacheKey = `top-area-${nombreArea}-${limitNum}`;
    const cached = getCacheRanking(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, "rankings_users"),
      where("area", "==", nombreArea)
    );

    const snapshot = await getDocs(q);
    const result = snapshot.docs
      .map(doc => ({
      ...doc.data(),
      }))
      .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
      .slice(0, limitNum)
      .map((usuario, index) => ({
        ...usuario,
        posicion: index + 1
      }));

    setCacheRanking(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error al obtener top área:", error);
    return [];
  }
};

// TOP 3 GLOBAL
export const obtenerTopGlobal = async (limitNum = 3) => {
  try {
    const cacheKey = `top-global-${limitNum}`;
    const cached = getCacheRanking(cacheKey);
    if (cached) return cached;

    const q = query(
      collection(db, "rankings_users"),
      orderBy("puntos", "desc"),
      limit(limitNum)
    );

    const snapshot = await getDocs(q);
    const result = snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      posicion: index + 1
    }));

    setCacheRanking(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error al obtener top global:", error);
    return [];
  }
};

// Mi posición en el área
export const obtenerMiPosicionArea = async (userId) => {
  try {
    await actualizarRankingConArea(userId);

    const cacheKey = `posicion-${userId}`;
    const cached = getCacheRanking(cacheKey);
    if (cached) return cached;

    const userSnap = await getDoc(doc(db, "rankings_users", userId));

    if (!userSnap.exists()) {
      return {
        posicionArea: 0,
        posicionGlobal: 0,
        totalEnArea: 0,
        nombreArea: "Sin Área",
        puntos: 0,
        nivel: "Bronce"
      };
    }

    const data = userSnap.data();
    const result = {
      posicionArea: data.posicionArea || 0,
      posicionGlobal: data.posicionGlobal || 0,
      totalEnArea: data.totalEnArea || 0,
      nombreArea: data.area || data.nombreArea || "Sin Área",
      puntos: data.puntos || 0,
      nivel: data.nivel || "Bronce"
    };

    setCacheRanking(cacheKey, result);
    return result;
  } catch (error) {
    return {
      posicionArea: 0,
      posicionGlobal: 0,
      totalEnArea: 0,
      nombreArea: "Sin Área",
      puntos: 0,
      nivel: "Bronce"
    };
  }
};

// Obtener todos los users del área para comparativa
export const obtenerUsuariosArea = async (nombreArea) => {
  try {
    const q = query(
      collection(db, "rankings_users"),
      where("area", "==", nombreArea)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ ...doc.data() }))
      .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
      .map((usuario, index) => ({
        ...usuario,
        posicion: index + 1
      }));
  } catch (error) {
    console.error("Error al obtener users del área:", error);
    return [];
  }
};
