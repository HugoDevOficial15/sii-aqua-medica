const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  db,
  materiaPrimaCollection,
  materialAcondicionamientoCollection,
  productoTerminadoCollection,
  rackStockCollection,
  itemCollections,
  getPayload,
  validatePayload,
  FieldValue,
} = require("./utils");

const sincronizarNombreEnStockPorItem = async ({ itemId, nombre, tipoItem = null }) => {
  if (!itemId) {
    return 0;
  }

  const nombreNormalizado = typeof nombre === "string" ? nombre.trim() : "";
  if (!nombreNormalizado) {
    return 0;
  }

  const snap = await rackStockCollection
    .where("itemId", "==", itemId)
    .where("activo", "==", true)
    .get();

  if (snap.empty) {
    return 0;
  }

  const batch = db.batch();
  snap.docs.forEach((docItem) => {
    const updates = {
      nombreItem: nombreNormalizado,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (tipoItem) {
      updates.tipoItem = tipoItem;
    }

    batch.update(rackStockCollection.doc(docItem.id), updates);
  });

  await batch.commit();
  return snap.docs.length;
};

exports.crearMateriaPrima = onCall(async (request) => {
  const payload = validatePayload(getPayload(request), "datos de materia prima");

  const docRef = await materiaPrimaCollection.add({
    ...payload,
    fechaCreacion: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id };
});

exports.obtenerMateriaPrima = onCall(async () => {
  const snap = await materiaPrimaCollection.orderBy("fechaCreacion", "asc").get();
  const materiaPrima = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { materiaPrima };
});

exports.actualizarMateriaPrima = onCall(async (request) => {
  const payload = getPayload(request);
  const { id, data } = payload;

  if (!id) {
    throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar la materia prima.");
  }

  validatePayload(data, "datos de materia prima");

  await materiaPrimaCollection.doc(id).update({
    ...data,
    fechaActualizacion: FieldValue.serverTimestamp(),
  });

  if (typeof data?.nombre === "string") {
    await sincronizarNombreEnStockPorItem({
      itemId: id,
      nombre: data.nombre,
      tipoItem: data.tipo || null,
    });
  }

  return { id };
});

exports.obtenerItemsPorTipo = onCall(async (request) => {
  const tipo = String(request?.data?.tipo ?? "").trim();

  if (!tipo) {
    return { items: [] };
  }

  const collectionRef = itemCollections[tipo];

  if (!collectionRef) {
    throw new HttpsError("invalid-argument", `El tipo de almacenamiento "${tipo}" no es válido.`);
  }

  const snap = await collectionRef.orderBy("fechaCreacion", "asc").get();

  return {
    items: snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
});

exports.crearAcondicionamiento = onCall(async (request) => {
  const payload = validatePayload(getPayload(request), "datos de material de acondicionamiento");

  const docRef = await materialAcondicionamientoCollection.add({
    ...payload,
    fechaCreacion: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id };
});

exports.obtenerAcondicionamiento = onCall(async () => {
  const snap = await materialAcondicionamientoCollection.orderBy("fechaCreacion", "asc").get();
  const materialAcondicionamiento = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { materialAcondicionamiento };
});

exports.actualizarAcondicionamiento = onCall(async (request) => {
  const payload = getPayload(request);
  const { id, data } = payload;

  if (!id) {
    throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar el material de acondicionamiento.");
  }

  validatePayload(data, "datos de material de acondicionamiento");

  await materialAcondicionamientoCollection.doc(id).update({
    ...data,
    fechaActualizacion: FieldValue.serverTimestamp(),
  });

  if (typeof data?.nombre === "string") {
    await sincronizarNombreEnStockPorItem({
      itemId: id,
      nombre: data.nombre,
      tipoItem: data.tipo || null,
    });
  }

  return { id };
});

exports.crearProducto = onCall(async (request) => {
  const payload = validatePayload(getPayload(request), "datos de producto terminado");

  const docRef = await productoTerminadoCollection.add({
    ...payload,
    fechaCreacion: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id };
});

exports.obtenerProducto = onCall(async () => {
  const snap = await productoTerminadoCollection.orderBy("fechaCreacion", "asc").get();
  const productoTerminado = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { productoTerminado };
});

exports.actualizarProducto = onCall(async (request) => {
  const payload = getPayload(request);
  const { id, data } = payload;

  if (!id) {
    throw new HttpsError("invalid-argument", "Se requiere un ID válido para actualizar el producto terminado.");
  }

  validatePayload(data, "datos de producto terminado");

  await productoTerminadoCollection.doc(id).update({
    ...data,
    fechaActualizacion: FieldValue.serverTimestamp(),
  });

  if (typeof data?.nombre === "string") {
    await sincronizarNombreEnStockPorItem({
      itemId: id,
      nombre: data.nombre,
      tipoItem: data.tipo || null,
    });
  }

  return { id };
});
