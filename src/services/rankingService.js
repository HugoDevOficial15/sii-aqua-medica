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
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    const areaFinal = userData.nombreArea || userData.area || userData.Area;
    const equipo = userData.equipo || "";
    const nombre = userData.nombre || "Usuario";

    if (!areaFinal) return null; 

    // 1. Traer a TODOS los del área (ignorando mayúsculas/minúsculas en el nombre del campo)
    let qArea = query(collection(db, "users"), where("area", "==", areaFinal));
    let usuariosAreaSnap = await getDocs(qArea);

    if (usuariosAreaSnap.empty) {
        qArea = query(collection(db, "users"), where("Area", "==", areaFinal));
        usuariosAreaSnap = await getDocs(qArea);
    }

    // 2. Filtrar y consultar puntos (en PARALELO, no secuencial)
    const usuariosFiltrados = usuariosAreaSnap.docs.filter(uDoc => {
      const uData = uDoc.data();
      // FILTRO 1: Ignorar usuarios dados de baja
      if (uData.activo === false) return false;
      // FILTRO 2: Ignorar a cualquiera que no sea "operador"
      const rol = String(uData.rol || uData.Rol || "").toLowerCase();
      return rol.includes("operador");
    });

    // Usar Promise.all() para consultar puntos en paralelo
    const usuariosAreaConPuntos = await Promise.all(
      usuariosFiltrados.map(async (uDoc) => {
        const pRef = doc(db, "users", uDoc.id, año, "informacion", "puntos_general", "general");
        const pSnap = await getDoc(pRef);

        return {
          uid: uDoc.id,
          puntos: pSnap.exists() ? (pSnap.data().total || 0) : 0,
          nivel: pSnap.exists() ? (pSnap.data().nivel || "Bronce") : "Bronce"
        };
      })
    );

    // Si por alguna razón la lista queda vacía, abortamos el guardado
    if (usuariosAreaConPuntos.length === 0) return null;

    // 3. Ordenar de mayor a menor puntaje
    usuariosAreaConPuntos.sort((a, b) => b.puntos - a.puntos);
    
    // 4. Calcular la posición real
    const posicionArea = usuariosAreaConPuntos.findIndex(u => u.uid === userId) + 1;
    const totalEnArea = usuariosAreaConPuntos.length;

    const misDatos = usuariosAreaConPuntos.find(u => u.uid === userId);
    const misPuntos = misDatos ? misDatos.puntos : 0;
    const miNivel = misDatos ? misDatos.nivel : "Bronce";

    // 5. Guardar resultados
    await setDoc(
      doc(db, "rankings_users", userId),
      {
        uid: userId,
        nombre,
        puntos: misPuntos,
        nivel: miNivel,
        area: areaFinal,
        nombreArea: areaFinal,
        equipo,
        posicionArea,
        totalEnArea,
        actualizadoEn: serverTimestamp()
      },
      { merge: true }
    );

    limpiarCacheRanking();

    return { posicionGlobal: 0, posicionArea, totalEnArea, nombreArea: areaFinal };

  } catch (error) {
    console.error("Error al actualizar ranking:", error);
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
