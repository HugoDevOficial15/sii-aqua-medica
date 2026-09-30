const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.getOperatorPreferences = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();
    const preferences = {
      theme: userData?.preferences?.theme || "system",
      fontSize: userData?.preferences?.fontSize || "normal",
      notifications: userData?.preferences?.notifications ?? true,
      language: userData?.preferences?.language || "es",
    };

    return {
      preferences,
    };
  } catch (error) {
    console.error("Error in getOperatorPreferences:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener preferencias");
  }
});

exports.updateOperatorPreferences = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { theme, fontSize, notifications, language } = request.data || {};

  try {
    const userRef = usersCollection.doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const updateData = {
      preferences: {
        ...userDoc.data()?.preferences,
      },
      updatedAt: new Date().toISOString(),
    };

    if (theme !== undefined) updateData.preferences.theme = theme;
    if (fontSize !== undefined) updateData.preferences.fontSize = fontSize;
    if (notifications !== undefined) updateData.preferences.notifications = notifications;
    if (language !== undefined) updateData.preferences.language = language;

    await userRef.update(updateData);

    return {
      success: true,
      preferences: updateData.preferences,
    };
  } catch (error) {
    console.error("Error in updateOperatorPreferences:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al actualizar preferencias");
  }
});

exports.updateProfilePhoto = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { photoUrl } = request.data || {};

  try {
    if (!photoUrl) {
      throw new HttpsError("invalid-argument", "URL de foto requerida");
    }

    const userRef = usersCollection.doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    await userRef.update({
      fotoPerfil: photoUrl,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      photoUrl,
    };
  } catch (error) {
    console.error("Error in updateProfilePhoto:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al actualizar foto de perfil");
  }
});
