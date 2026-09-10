import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "../config/firebase";
import { actualizarRankingConArea } from "./rankingService";

// Helper para obtener el año actual
const obtenerAñoActual = () => new Date().getFullYear().toString();

const obtenerHistorialRef = (userDocId, año) =>
  collection(db, "users", userDocId, año, "informacion", "historialPuntos");

const obtenerPuntosRef = (userDocId, año) =>
  doc(collection(db, "users", userDocId, año, "informacion", "puntos_general"), "general");

// Resolver el documentId del usuario a partir del firebaseUid
const resolveUserDocIdByFirebaseUid = async (firebaseUid) => {
  if (!firebaseUid) return null;
  try {
    const directUserSnapshot = await getDoc(doc(db, "users", firebaseUid));
    if (directUserSnapshot.exists()) {
      return firebaseUid;
    }

    const q = query(collection(db, "users"), where("uid", "==", firebaseUid));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].id;
  } catch (error) {
    return null;
  }
};

// Reglas de puntos por acción
export const PUNTO_RULES = {
  encuesta_completada: { puntos: 50, objetivo: true },
  capacitacion_completada: { puntos: 100, objetivo: true },
  sugerencia_enviada: { puntos: 20, objetivo: true },
  sugerencia_aprobada: { puntos: 50, badge: true },
  cita_asistida: { puntos: 10, objetivo: false }
};

// Rangos de niveles
export const NIVELES = {
  Bronce: { min: 0, max: 499 },
  Plata: { min: 500, max: 999 },
  Oro: { min: 1000, max: Infinity }
};

// Registrar puntos por una acción
export const registrarPuntos = async (userId, tipo, referencia) => {
  try {
    // Validación: userId no debe estar vacío
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error("registrarPuntos: userId inválido", userId);
      return false;
    }

    const puntos = PUNTO_RULES[tipo]?.puntos || 0;

    if (puntos === 0) {
      return false;
    }

    const año = obtenerAñoActual();
    // userId ya es el documentId de Firestore (viene de user.id en AuthProvider)
    const userDocId = userId;

    // 1. Agregar a historial de puntos
    await addDoc(obtenerHistorialRef(userDocId, año), {
      tipo,
      puntos,
      referencia,
      fechaCreacion: serverTimestamp()
    });

    // 2. Recalcular total de puntos
    await recalcularPuntos(userDocId, año);

    // 3. Actualizar ranking
    await actualizarRankingConArea(userDocId, año);

    // 4. Limpiar cache para forzar refetch inmediato
    try {
      localStorage.removeItem(`posicion-${userDocId}`);
    } catch (e) {
      // Error al limpiar cache, pero continuar
    }

    return true;
  } catch (error) {
    console.error("Error al registrar puntos para userId:", userId, "error:", error);
    return false;
  }
};

// Recalcular puntos totales del usuario
export const recalcularPuntos = async (userId, año = obtenerAñoActual()) => {
  try {
    const snapshot = await getDocs(
      obtenerHistorialRef(userId, año)
    );

    const total = snapshot.docs.reduce((sum, doc) => sum + doc.data().puntos, 0);
    const nivel = calcularNivel(total);
    const proximoNivel = calcularProximoNivel(total);

    await setDoc(
      obtenerPuntosRef(userId, año),
      {
        total,
        nivel,
        proximoNivel,
        actualizadoEn: serverTimestamp()
      },
      { merge: true }
    );

    return { total, nivel, proximoNivel };
  } catch (error) {
    console.error("Error al recalcular puntos:", error);
    return null;
  }
};

// Calcular nivel según puntos totales
export const calcularNivel = (puntos) => {
  for (const [nivel, { min, max }] of Object.entries(NIVELES)) {
    if (puntos >= min && puntos <= max) {
      return nivel;
    }
  }
  return "Bronce";
};

// Calcular puntos faltantes para siguiente nivel
export const calcularProximoNivel = (puntos) => {
  const niveles = [
    { min: 0, max: 499 },
    { min: 500, max: 999 },
    { min: 1000, max: Infinity }
  ];

  for (let i = 0; i < niveles.length; i++) {
    const nivelActual = niveles[i];
    if (puntos >= nivelActual.min && puntos <= nivelActual.max) {
      // Si es el último nivel, retornar puntos actuales
      if (i === niveles.length - 1) {
        return puntos;
      }
      // Retornar progreso al siguiente nivel
      const siguienteNivel = niveles[i + 1];
      return siguienteNivel.min - puntos;
    }
  }

  return 0;
};

// Obtener historial de puntos del usuario
export const obtenerHistorialPuntos = async (userId, limitNum = 10, año = obtenerAñoActual()) => {
  try {
    const q = query(
      obtenerHistorialRef(userId, año),
      orderBy("fechaCreacion", "desc"),
      limit(limitNum)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al obtener historial de puntos:", error);
    return [];
  }
};

// Obtener puntos del usuario
export const obtenerPuntosUsuario = async (userId, año = obtenerAñoActual()) => {
  try {
    const docSnap = await getDoc(
      obtenerPuntosRef(userId, año)
    );

    if (docSnap.exists()) {
      return docSnap.data();
    }

    // Si no existe, crear documento vacío
    await setDoc(
      obtenerPuntosRef(userId, año),
      {
        total: 0,
        nivel: "Bronce",
        proximoNivel: 500,
        actualizadoEn: serverTimestamp()
      }
    );

    return {
      total: 0,
      nivel: "Bronce",
      proximoNivel: 500
    };
  } catch (error) {
    console.error("Error al obtener información de puntos");
    return null;
  }
};

// Obtener últimos logros (últimas acciones)
export const obtenerUltimosLogros = async (userId, limitNum = 4, año = obtenerAñoActual()) => {
  try {
    const snapshot = await getDocs(
      obtenerHistorialRef(userId, año)
    );

    const logros = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => b.fechaCreacion?.toMillis() - a.fechaCreacion?.toMillis())
      .slice(0, limitNum);

    return logros;
  } catch (error) {
    console.error("Error al obtener últimos logros:", error);
    return [];
  }
};

// Obtener objetivos completados del mes
export const obtenerObjetivosCompletados = async (userId, año = obtenerAñoActual()) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const snapshot = await getDocs(
      obtenerHistorialRef(userId, año)
    );

    const objetivos = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const fecha = data.fechaCreacion?.toDate();

      // Solo contar acciones de este mes
      if (fecha && fecha >= inicioMes) {
        const tipo = data.tipo;
        if (PUNTO_RULES[tipo]?.objetivo) {
          objetivos[tipo] = (objetivos[tipo] || 0) + 1;
        }
      }
    });

    return objetivos;
  } catch (error) {
    console.error("Error al obtener objetivos completados:", error);
    return {};
  }
};
