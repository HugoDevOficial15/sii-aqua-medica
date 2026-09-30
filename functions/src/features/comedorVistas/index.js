const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const comedorMenusCollection = db.collection("comedorMenus");
const comedorSolicitudesCollection = db.collection("comedorSolicitudes");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getComedorVisualizacionSemanal = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { semana } = request.data || {};

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    // Obtener menús de la semana
    const menuSnapshot = await comedorMenusCollection
      .where("semana", "==", semana)
      .get();

    const menus = menuSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener solicitudes de comida del usuario para esa semana
    const solicitudesSnapshot = await comedorSolicitudesCollection
      .where("usuarioId", "==", uid)
      .where("semana", "==", semana)
      .get();

    const solicitudes = solicitudesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calcular estadísticas
    const diasConComida = {
      desayuno: 0,
      comida: 0,
      cena: 0,
    };

    solicitudes.forEach(sol => {
      if (sol.desayuno) diasConComida.desayuno++;
      if (sol.comida) diasConComida.comida++;
      if (sol.cena) diasConComida.cena++;
    });

    return {
      menus,
      solicitudes,
      diasConComida,
      stats: {
        desayuno: diasConComida.desayuno,
        comida: diasConComida.comida,
        cena: diasConComida.cena,
      },
    };
  } catch (error) {
    console.error("Error in getComedorVisualizacionSemanal:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener visualización semanal");
  }
});

exports.getComedorCostos = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { desde, hasta } = request.data || {};

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    let query = comedorSolicitudesCollection.where("usuarioId", "==", uid);

    if (desde) {
      query = query.where("fecha", ">=", desde);
    }
    if (hasta) {
      query = query.where("fecha", "<=", hasta);
    }

    const snapshot = await query.get();

    const solicitudes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calcular costos
    let totalDesayunos = 0;
    let totalComidas = 0;
    let totalCenas = 0;

    const PRECIOS = {
      desayuno: 15,
      comida: 45,
      cena: 30,
    };

    solicitudes.forEach(sol => {
      if (sol.desayuno) totalDesayunos += PRECIOS.desayuno;
      if (sol.comida) totalComidas += PRECIOS.comida;
      if (sol.cena) totalCenas += PRECIOS.cena;
    });

    const total = totalDesayunos + totalComidas + totalCenas;

    return {
      costos: {
        desayuno: totalDesayunos,
        comida: totalComidas,
        cena: totalCenas,
        total,
      },
      solicitudes: solicitudes.length,
    };
  } catch (error) {
    console.error("Error in getComedorCostos:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener costos del comedor");
  }
});
