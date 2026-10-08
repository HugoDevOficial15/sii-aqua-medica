const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const COMEDOR_COSTOS = {
  DESAYUNO: 25,
  COMIDA: 25,
  CENA: 25,
};

const calcularCostoArray = (array, costo) => {
  return array.reduce((total, item) => {
    if (item === "NA" || !item) return total;
    return total + costo;
  }, 0);
};

exports.saveComedorOrden = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const {
    IDoperador = "",
    IDdocF = "", // semana en formato "01.09.2025-07.09.2025"
    Nombre = "",
    Nomina = "",
    Area = "",
    Desayuno = "[]", // JSON string
    Comida = "[]",
    Cena = "[]",
  } = request.data || {};

  try {
    if (!IDdocF || !IDoperador) {
      throw new HttpsError(
        "invalid-argument",
        "Semana e IDoperador son requeridos"
      );
    }

    let desayunos = [];
    let comidas = [];
    let cenas = [];

    // Parsear arrays si vienen como strings JSON
    try {
      desayunos = typeof Desayuno === "string" ? JSON.parse(Desayuno) : Desayuno || [];
      comidas = typeof Comida === "string" ? JSON.parse(Comida) : Comida || [];
      cenas = typeof Cena === "string" ? JSON.parse(Cena) : Cena || [];
    } catch (e) {
      console.error("Error parsing arrays:", e);
      desayunos = [];
      comidas = [];
      cenas = [];
    }

    // Calcular totales
    const totalDesayuno = calcularCostoArray(desayunos, COMEDOR_COSTOS.DESAYUNO);
    const totalComida = calcularCostoArray(comidas, COMEDOR_COSTOS.COMIDA);
    const totalCena = calcularCostoArray(cenas, COMEDOR_COSTOS.CENA);
    const totalSemana = totalDesayuno + totalComida + totalCena;

    // Estructura de documento para guardar
    const ordenData = {
      IDoperador: String(IDoperador),
      IDdocF: IDdocF,
      Nombre: String(Nombre),
      Nomina: String(Nomina),
      Area: String(Area),
      Desayuno: desayunos,
      Comida: comidas,
      Cena: cenas,
      TotalDesayuno: totalDesayuno,
      TotalComida: totalComida,
      TotalCena: totalCena,
      TotalSemana: totalSemana,
      ConfirmDate: new Date().toISOString(),
      CobranzaSemana: false,
      updatedAt: new Date().toISOString(),
    };

    // Guardar en Firestore: Comida/{semana}
    const docRef = db.collection("Comida").doc(IDdocF);
    await docRef.set(ordenData, { merge: true });

    console.log(`✓ Orden guardada para ${Nombre} (${IDdocF})`);
    console.log(`  Total: $${totalSemana} (D:$${totalDesayuno} C:$${totalComida} Ce:$${totalCena})`);

    return {
      success: true,
      message: "Orden guardada correctamente",
      data: {
        IDdocF,
        TotalDesayuno: totalDesayuno,
        TotalComida: totalComida,
        TotalCena: totalCena,
        TotalSemana: totalSemana,
      },
    };
  } catch (error) {
    console.error("Error in saveComedorOrden:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al guardar orden de comedor");
  }
});

exports.obtenerComedorOrden = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const { semana = "" } = request.data || {};

  try {
    if (!semana) {
      throw new HttpsError("invalid-argument", "Semana es requerida");
    }

    const docRef = db.collection("Comida").doc(semana);
    const doc = await docRef.get();

    if (!doc.exists) {
      return {
        success: false,
        message: "No hay orden guardada para esta semana",
        data: null,
      };
    }

    return {
      success: true,
      data: doc.data(),
    };
  } catch (error) {
    console.error("Error in obtenerComedorOrden:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener orden de comedor");
  }
});
