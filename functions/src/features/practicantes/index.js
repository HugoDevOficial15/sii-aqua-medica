const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const practicantesCollection = db.collection("practicantes");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

const normalizeSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .trim()
  .toLowerCase();

const practicanteFromSnapshot = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

exports.getPracticantesPage = onCall(async (request) => {
  requireAuth(request);

  const { cursor = null, pageSize = 30 } = request.data || {};
  const limit = Math.min(Math.max(Number(pageSize || 30), 1), 60);

  try {
    let query = practicantesCollection.where("activo", "==", true).orderBy("nombre", "asc").limit(limit + 1);

    if (cursor !== undefined && cursor !== null && cursor !== "") {
      const cursorDoc = await practicantesCollection.doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.map(practicanteFromSnapshot);
    const hasMore = docs.length > limit;
    const practicantes = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? practicantes[practicantes.length - 1]?.id : null;

    return {
      practicantes,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error("Error in getPracticantesPage:", error);
    throw new HttpsError("internal", "Error al cargar practicantes");
  }
});

exports.searchPracticantes = onCall(async (request) => {
  requireAuth(request);

  const { search = "" } = request.data || {};

  try {
    const normalizedSearch = normalizeSearchText(search);

    if (!normalizedSearch) {
      const snapshot = await practicantesCollection.where("activo", "==", true).limit(30).get();
      return {
        practicantes: snapshot.docs.map(practicanteFromSnapshot),
        hasMore: false,
      };
    }

    const snapshot = await practicantesCollection
      .where("activo", "==", true)
      .orderBy("nombre", "asc")
      .limit(30)
      .get();

    const practicantes = snapshot.docs
      .map(practicanteFromSnapshot)
      .filter((p) => {
        const nombre = normalizeSearchText(p.nombre || "");
        return nombre.includes(normalizedSearch);
      });

    return {
      practicantes,
      hasMore: false,
    };
  } catch (error) {
    console.error("Error in searchPracticantes:", error);
    throw new HttpsError("internal", "Error al buscar practicantes");
  }
});

exports.createPracticante = onCall(async (request) => {
  requireAuth(request);

  const data = request.data || {};

  try {
    const {
      nombre = "",
      escuela = "",
      area = "",
      cumpleanos = "",
      fechaIngreso = "",
      curp = "",
      nomina = 0,
    } = data;

    if (!nombre || !escuela || !area) {
      throw new HttpsError("invalid-argument", "Nombre, escuela y área son obligatorios");
    }

    if (nomina < 10000) {
      throw new HttpsError("invalid-argument", "La nómina debe ser mayor o igual a 10000");
    }

    const existing = await practicantesCollection.where("nomina", "==", Number(nomina)).limit(1).get();
    if (!existing.empty) {
      throw new HttpsError("already-exists", "Ya existe un practicante con esa nómina");
    }

    const practicanteData = {
      nombre: String(nombre).trim(),
      escuela: String(escuela).trim(),
      area: String(area).trim(),
      cumpleanos: String(cumpleanos).trim(),
      fechaIngreso: String(fechaIngreso).trim(),
      curp: String(curp).trim().toUpperCase(),
      nomina: Number(nomina),
      activo: true,
      estado: "activo",
      rol: "practicante",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await practicantesCollection.add(practicanteData);
    const doc = await docRef.get();

    return {
      id: doc.id,
      uid: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error in createPracticante:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al crear practicante");
  }
});

exports.updatePracticante = onCall(async (request) => {
  requireAuth(request);

  const { id = "", data = {} } = request.data || {};

  try {
    if (!id) {
      throw new HttpsError("invalid-argument", "ID de practicante requerido");
    }

    const docRef = practicantesCollection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Practicante no encontrado");
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.nomina !== undefined && data.nomina !== null) {
      const existing = await practicantesCollection
        .where("nomina", "==", Number(data.nomina))
        .where("__name__", "!=", id)
        .limit(1)
        .get();
      if (!existing.empty) {
        throw new HttpsError("already-exists", "Ya existe otro practicante con esa nómina");
      }
    }

    await docRef.update(updateData);
    const updated = await docRef.get();

    return {
      id: updated.id,
      ...updated.data(),
    };
  } catch (error) {
    console.error("Error in updatePracticante:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al actualizar practicante");
  }
});
