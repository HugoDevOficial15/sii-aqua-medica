const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

exports.getUserData = onCall(async (request) => {
    const nomina = String(request.data?.nomina ?? "").trim();

    if (!nomina) {
        throw new HttpsError("invalid-argument", "Nomina is required");
    }

    const email = `${nomina}@aquamedica.com`;
    const querySnapshot = await db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

    if (querySnapshot.empty) {
        throw new HttpsError("not-found", "User not found");
    }

    const userDoc = querySnapshot.docs[0];
    return {
        id: userDoc.id,
        ...userDoc.data(),
    };
});