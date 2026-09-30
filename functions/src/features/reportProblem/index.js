const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");
const problemsCollection = db.collection("problems");

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
};

exports.reportProblem = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;
  const { titulo, descripcion, categoria, adjuntos } = request.data || {};

  try {
    if (!titulo || !descripcion) {
      throw new HttpsError("invalid-argument", "Título y descripción son requeridos");
    }

    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado");
    }

    const userData = userDoc.data();

    const problemData = {
      titulo: String(titulo).trim(),
      descripcion: String(descripcion).trim(),
      categoria: categoria || "general",
      usuarioId: uid,
      usuarioNombre: userData?.nombre || userData?.email || "Usuario",
      usuarioEmail: userData?.email,
      estado: "nuevo",
      adjuntos: adjuntos || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await problemsCollection.add(problemData);

    return {
      id: docRef.id,
      problem: {
        id: docRef.id,
        ...problemData,
      },
      message: "Problema reportado exitosamente",
    };
  } catch (error) {
    console.error("Error in reportProblem:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al reportar problema");
  }
});

exports.getMyProblems = onCall(async (request) => {
  requireAuth(request);

  const { uid } = request.auth;

  try {
    const snapshot = await problemsCollection
      .where("usuarioId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const problems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      problems,
      count: problems.length,
    };
  } catch (error) {
    console.error("Error in getMyProblems:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener problemas reportados");
  }
});

exports.getProblemDetails = onCall(async (request) => {
  requireAuth(request);

  const { problemId } = request.data || {};

  try {
    if (!problemId) {
      throw new HttpsError("invalid-argument", "ID de problema requerido");
    }

    const problemDoc = await problemsCollection.doc(problemId).get();
    if (!problemDoc.exists) {
      throw new HttpsError("not-found", "Problema no encontrado");
    }

    const problem = problemDoc.data();

    // Verificar que el usuario es dueño del problema
    if (problem.usuarioId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "No tienes permiso para ver este problema");
    }

    return {
      problem: {
        id: problemDoc.id,
        ...problem,
      },
    };
  } catch (error) {
    console.error("Error in getProblemDetails:", error);
    if (error.code) throw error;
    throw new HttpsError("internal", "Error al obtener detalles del problema");
  }
});
