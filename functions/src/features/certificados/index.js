const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorCertificates = onCall(async (request) => {
  requireAuth(request);

  const auth = request.auth;
  const { year = null } = request.data || {};

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

    // Buscar certificados por nómina
    let query = db.collection("certificados").where("nomina", "==", String(nomina));

    if (year) {
      // Filtrar por año si se proporciona
      const yearNum = Number(year);
      const startDate = new Date(`${yearNum}-01-01`);
      const endDate = new Date(`${yearNum}-12-31`);

      query = query
        .where("fechaCompletacion", ">=", startDate)
        .where("fechaCompletacion", "<=", endDate);
    }

    const snapshot = await query.orderBy("fechaCompletacion", "desc").get();

    if (snapshot.empty) {
      return {
        success: true,
        message: "Sin certificados",
        data: [],
      };
    }

    const certificados = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Agrupar por tipo de certificado
    const grouped = certificados.reduce((acc, cert) => {
      const tipo = cert.tipoCertificado || "Otro";
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(cert);
      return acc;
    }, {});

    console.log(`✓ ${certificados.length} certificados encontrados para nómina ${nomina}`);

    return {
      success: true,
      data: certificados,
      grouped,
      total: certificados.length,
    };
  } catch (error) {
    console.error("Error in getOperatorCertificates:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener certificados");
  }
});

exports.getCertificatesByYear = onCall(async (request) => {
  requireAuth(request);

  const auth = request.auth;
  const { year = new Date().getFullYear() } = request.data || {};

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

    const yearNum = Number(year);
    const startDate = new Date(`${yearNum}-01-01`);
    const endDate = new Date(`${yearNum}-12-31T23:59:59`);

    const snapshot = await db
      .collection("certificados")
      .where("nomina", "==", String(nomina))
      .where("fechaCompletacion", ">=", startDate)
      .where("fechaCompletacion", "<=", endDate)
      .orderBy("fechaCompletacion", "desc")
      .get();

    const certificados = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calcular estadísticas
    const stats = {
      total: certificados.length,
      porTipo: {},
    };

    certificados.forEach((cert) => {
      const tipo = cert.tipoCertificado || "Otro";
      stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + 1;
    });

    console.log(`✓ ${certificados.length} certificados encontrados para año ${year}`);

    return {
      success: true,
      year,
      data: certificados,
      stats,
    };
  } catch (error) {
    console.error("Error in getCertificatesByYear:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener certificados del año");
  }
});
