const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorIncidences = onCall(async (request) => {
  requireAuth(request);

  const auth = request.auth;
  const {
    estado = null,
    search = "",
    pageSize = 30,
    cursor = null
  } = request.data || {};

  try {
    // Obtener datos del usuario autenticado
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const nomina = userData?.nomina || userData?.id;

    if (!nomina) {
      throw new HttpsError("invalid-argument", "Usuario sin nómina");
    }

    // Construir query base
    let query = db
      .collection("incidencias_personal")
      .where("empleadoId", "==", String(nomina))
      .orderBy("fechaCreacion", "desc");

    // Filtrar por estado si se proporciona
    if (estado) {
      query = query.where("estado", "==", estado);
    }

    // Ejecutar query con paginación
    let snapshot;
    if (cursor !== undefined && cursor !== null && cursor !== "") {
      const cursorDoc = await db.collection("incidencias_personal").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    snapshot = await query.limit(pageSize + 1).get();

    let incidencias = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filtrar por búsqueda (descripción o tipo)
    if (search) {
      const searchLower = search.toLowerCase();
      incidencias = incidencias.filter((inc) => {
        const desc = (inc.descripcion || "").toLowerCase();
        const tipo = (inc.tipo || "").toLowerCase();
        return desc.includes(searchLower) || tipo.includes(searchLower);
      });
    }

    const hasMore = incidencias.length > pageSize;
    if (hasMore) {
      incidencias = incidencias.slice(0, pageSize);
    }

    const nextCursor = hasMore ? incidencias[incidencias.length - 1]?.id : null;

    console.log(`✓ ${incidencias.length} incidencias encontradas para nómina ${nomina}`);

    return {
      success: true,
      data: incidencias,
      hasMore,
      nextCursor,
      total: incidencias.length,
    };
  } catch (error) {
    console.error("Error in getOperatorIncidences:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener incidencias");
  }
});

exports.getIncidenceDetails = onCall(async (request) => {
  requireAuth(request);

  const auth = request.auth;
  const { incidenciaId = "" } = request.data || {};

  try {
    if (!incidenciaId) {
      throw new HttpsError("invalid-argument", "ID de incidencia requerido");
    }

    // Obtener la incidencia
    const docRef = db.collection("incidencias_personal").doc(incidenciaId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Incidencia no encontrada");
    }

    const incidencia = {
      id: doc.id,
      ...doc.data(),
    };

    // Verificar que pertenece al usuario autenticado
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const nomina = userData?.nomina || userData?.id;

    if (incidencia.empleadoId !== String(nomina)) {
      throw new HttpsError("permission-denied", "No tienes permiso para ver esta incidencia");
    }

    // Obtener seguimiento si existe
    const followUpSnapshot = await db
      .collection("incidencias_personal")
      .doc(incidenciaId)
      .collection("seguimiento")
      .orderBy("fecha", "desc")
      .get();

    const seguimiento = followUpSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✓ Detalles de incidencia ${incidenciaId} obtenidos`);

    return {
      success: true,
      data: incidencia,
      seguimiento,
    };
  } catch (error) {
    console.error("Error in getIncidenceDetails:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener detalles de incidencia");
  }
});

exports.getIncidencesByStatus = onCall(async (request) => {
  requireAuth(request);

  const auth = request.auth;
  const { estado = "abierto" } = request.data || {};

  try {
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const nomina = userData?.nomina || userData?.id;

    if (!nomina) {
      throw new HttpsError("invalid-argument", "Usuario sin nómina");
    }

    const snapshot = await db
      .collection("incidencias_personal")
      .where("empleadoId", "==", String(nomina))
      .where("estado", "==", estado)
      .orderBy("fechaCreacion", "desc")
      .limit(100)
      .get();

    const incidencias = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Agrupar por tipo
    const grouped = incidencias.reduce((acc, inc) => {
      const tipo = inc.tipo || "Otro";
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(inc);
      return acc;
    }, {});

    console.log(`✓ ${incidencias.length} incidencias con estado "${estado}" encontradas`);

    return {
      success: true,
      data: incidencias,
      grouped,
      total: incidencias.length,
      estado,
    };
  } catch (error) {
    console.error("Error in getIncidencesByStatus:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener incidencias por estado");
  }
});
