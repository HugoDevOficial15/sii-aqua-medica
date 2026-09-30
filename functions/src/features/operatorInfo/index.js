const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const configCollection = db.collection("config");
const appInfoCollection = db.collection("appInfo");

exports.getAppInfo = onCall(async (request) => {
  try {
    const infoDoc = await appInfoCollection.doc("main").get();
    if (!infoDoc.exists) {
      throw new HttpsError("not-found", "Información de la app no encontrada");
    }

    return {
      appInfo: infoDoc.data(),
    };
  } catch (error) {
    console.error("Error in getAppInfo:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener información de la app");
  }
});

exports.getLegalInfo = onCall(async (request) => {
  try {
    const legalDoc = await configCollection.doc("legal").get();
    if (!legalDoc.exists) {
      return {
        privacyPolicy: "",
        termsOfService: "",
        cookies: "",
      };
    }

    return {
      ...legalDoc.data(),
    };
  } catch (error) {
    console.error("Error in getLegalInfo:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener información legal");
  }
});

exports.getSupportInfo = onCall(async (request) => {
  try {
    const supportDoc = await configCollection.doc("support").get();
    if (!supportDoc.exists) {
      return {
        email: "",
        phone: "",
        supportUrl: "",
        faqUrl: "",
      };
    }

    return {
      ...supportDoc.data(),
    };
  } catch (error) {
    console.error("Error in getSupportInfo:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener información de soporte");
  }
});

exports.getMoreMenuItems = onCall(async (request) => {
  try {
    const menuDoc = await configCollection.doc("moreMenu").get();
    if (!menuDoc.exists) {
      return {
        items: [],
      };
    }

    return {
      items: menuDoc.data().items || [],
    };
  } catch (error) {
    console.error("Error in getMoreMenuItems:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener items del menú");
  }
});
