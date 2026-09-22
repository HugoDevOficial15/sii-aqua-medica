const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const puestoCollection = db.collection("puestos");

exports.getPuestos = onCall(async () => {
  const snapshot = await puestoCollection.get();
  const puestos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return puestos;
});


exports.crearPuesto = onCall(async (request) => {
  const { nombre } = request.data || {};
  if (!nombre) {
    throw new HttpsError("invalid-argument", "El nombre del puesto es requerido.");
  }

  const nuevoPuesto = {
    nombre,
    activo: true,
    createdAt: new Date(),
  };

  const docRef = await puestoCollection.add(nuevoPuesto);
  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() };
});


exports.updatePuesto = onCall(async (request) => {
    const { id, nombre, activo } = request.data || {};

    if (!id) {
      throw new HttpsError("invalid-argument", "El ID del puesto es requerido.");
    }

    const puestoRef = puestoCollection.doc(id);
    const doc = await puestoRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "El puesto no existe.");
    }

    const currentData = doc.data() || {};
    const nuevoActivo = typeof activo === "boolean" ? activo : currentData.activo ?? true;

    const actualizadoPuesto = {
      nombre: nombre || currentData.nombre,
      activo: nuevoActivo,
      updatedAt: new Date(),
    };

    await puestoRef.update(actualizadoPuesto);
    const updatedDoc = await puestoRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };

});