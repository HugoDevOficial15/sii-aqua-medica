const { db } = require("../../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const usersCollection = db.collection("users");

const normalizeNomina = (value) => {
  const nomina = Number(value);
  if (!Number.isInteger(nomina) || nomina <= 0) {
    throw new Error("La nómina no es válida.");
  }
  return nomina;
};

const normalizeSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const searchFields = (data = {}, nomina = data.nomina) => ({
  nombreBusqueda: normalizeSearchText(data.nombre),
  nominaBusqueda: nomina === undefined || nomina === null ? "" : String(nomina),
});

async function updateUserFieldsByNomina(nomina, updates = {}) {
  const normalizedNomina = normalizeNomina(nomina);
  const snapshot = await usersCollection.where("nomina", "==", normalizedNomina).get();

  if (snapshot.empty) {
    return { success: false, error: "NOMINA_NOT_FOUND" };
  }

  if (snapshot.size > 1) {
    return { success: false, error: "DUPLICATE_NOMINA" };
  }

  const user = snapshot.docs[0];
  const nextData = { ...user.data(), ...updates };

  await user.ref.update({
    ...updates,
    ...searchFields(nextData, nextData.nomina),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    data: { id: user.id, ...user.data(), ...updates },
  };
}

const updateUserFields = updateUserFieldsByNomina;

module.exports = {
  normalizeNomina,
  normalizeSearchText,
  searchFields,
  updateUserFields,
  updateUserFieldsByNomina,
};
