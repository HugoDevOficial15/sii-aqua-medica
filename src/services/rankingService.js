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

export const actualizarRankingConArea = async (userId) => {
  try {
    // 1. Obtener datos del usuario
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    const { nombreArea, area, equipo, nombre } = userData;

    // 2. Obtener puntos del usuario
    const puntosRef = doc(db, "users", userId, "puntos_general", "general");
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
      nombreArea: doc.data().nombreArea
    }));

    const usersOrdenadosGlobal = todosUsuarios
      .sort((a, b) => b.puntos - a.puntos);

    const posicionGlobal = usersOrdenadosGlobal
      .findIndex(u => u.uid === userId) + 1;

    // 4. Calcular RANKING DE ÁREA (COMPAÑEROS)
    const usersArea = todosUsuarios.filter(u => u.nombreArea === nombreArea);
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
        nombreArea,
        area,
        equipo,
        posicionGlobal,
        posicionArea,
        totalEnArea,
        actualizadoEn: serverTimestamp()
      },
      { merge: true }
    );

    return { posicionGlobal, posicionArea, totalEnArea, nombreArea };
  } catch (error) {
    return null;
  }
};

// TOP 3 DE MI ÁREA (compañeros de trabajo)
export const obtenerTopArea = async (nombreArea, limitNum = 3) => {
  try {
    const q = query(
      collection(db, "rankings_users"),
      where("nombreArea", "==", nombreArea),
      orderBy("puntos", "desc"),
      limit(limitNum)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      posicion: index + 1
    }));
  } catch (error) {
    console.error("Error al obtener top área:", error);
    return [];
  }
};

// TOP 3 GLOBAL
export const obtenerTopGlobal = async (limitNum = 3) => {
  try {
    const q = query(
      collection(db, "rankings_users"),
      orderBy("puntos", "desc"),
      limit(limitNum)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      posicion: index + 1
    }));
  } catch (error) {
    console.error("Error al obtener top global:", error);
    return [];
  }
};

// Mi posición en el área
export const obtenerMiPosicionArea = async (userId) => {
  try {
    const userSnap = await getDoc(doc(db, "rankings_users", userId));

    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();
    return {
      posicionArea: data.posicionArea,
      posicionGlobal: data.posicionGlobal,
      totalEnArea: data.totalEnArea,
      nombreArea: data.nombreArea,
      puntos: data.puntos,
      nivel: data.nivel
    };
  } catch (error) {
    console.error("Error al obtener posición:", error);
    return null;
  }
};

// Obtener todos los users del área para comparativa
export const obtenerUsuariosArea = async (nombreArea) => {
  try {
    const q = query(
      collection(db, "rankings_users"),
      where("nombreArea", "==", nombreArea),
      orderBy("puntos", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      ...doc.data(),
      posicion: index + 1
    }));
  } catch (error) {
    console.error("Error al obtener users del área:", error);
    return [];
  }
};
