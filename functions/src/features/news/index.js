const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { admin, db } = require("../../config/firebase");

const newsCollection = db.collection("noticias");

const getHoy = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeNewsPayload = (payload = {}) => {
  const cleaned = payload || {};

  return {
    titulo: String(cleaned.titulo ?? "").trim(),
    contenido: String(cleaned.contenido ?? "").trim(),
    fechaLimite: String(cleaned.fechaLimite ?? "").trim(),
    areaDestino: String(cleaned.areaDestino ?? "Todas").trim() || "Todas",
    imagen: cleaned.imagen || "",
    archivo: cleaned.archivo || "",
    archivoNombre: cleaned.archivoNombre || "",
    archivoRuta: cleaned.archivoRuta || "",
    estado: cleaned.estado || "Activa",
  };
};

const getOperatorUsersByArea = async (areaDestino) => {
  const isGeneralNews = !areaDestino || areaDestino === "Todas";

  let usersQuery = db.collection("users").where("rol", "==", "operador");
  if (!isGeneralNews) {
    usersQuery = usersQuery.where("area", "==", areaDestino);
  }

  let usersSnapshot = await usersQuery.get();

  if (usersSnapshot.empty) {
    usersQuery = db.collection("usuarios").where("rol", "==", "operador");
    if (!isGeneralNews) {
      usersQuery = usersQuery.where("area", "==", areaDestino);
    }
    usersSnapshot = await usersQuery.get();
  }

  return usersSnapshot.docs.filter((userDoc) => {
    const data = userDoc.data() || {};
    return data.rol === "operador" || data.rol === "operator";
  });
};

const notifyNewsToOperators = async (noticiaId, titulo, areaDestino) => {
  const usuariosDestino = await getOperatorUsersByArea(areaDestino);

  await Promise.all(
    usuariosDestino.map(async (userDoc) => {
      const data = userDoc.data() || {};
      const userId = data.uid || userDoc.id;
      const notificationRef = db.collection("notificaciones").doc();

      await notificationRef.set({
        IdUsuario: userId,
        Titulo: "📰 Nueva noticia",
        Mensaje: `Nueva noticia: "${titulo}"`,
        Destino: "/news",
        Accion: "nueva_noticia",
        fechaCreacion: FieldValue.serverTimestamp(),
        enviado: false,
        fechaEnviado: null,
        tipo: "news",
        noticiaId: noticiaId,
        extra: {
          tipo: "news",
          noticiaId: noticiaId,
          areaDestino: areaDestino || "Todas",
          titulo,
        },
      });
    })
  );
};

exports.getNoticias = onCall(async (request) => {
  const data = request?.data || {};
  const { areaDestino } = data;

  const noticiasSnapshot = await newsCollection.orderBy("fechaCreacion", "desc").get();
  const fechaHoy = getHoy();

  const noticias = noticiasSnapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((noticia) => {
      if (noticia.fechaLimite && noticia.fechaLimite < fechaHoy) {
        return false;
      }

      if (areaDestino && areaDestino !== "Todas" && noticia.areaDestino && noticia.areaDestino !== "Todas") {
        return noticia.areaDestino === areaDestino;
      }

      return true;
    });

  return { noticias };
});

exports.getNoticiasOperator = onCall(async (request) => {
  const currentArea = request?.data?.area || "";
  const noticiasSnapshot = await newsCollection.orderBy("fechaCreacion", "desc").get();
  const fechaHoy = getHoy();

  const noticias = noticiasSnapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .filter((noticia) => {
      if (noticia.fechaLimite && noticia.fechaLimite < fechaHoy) {
        return false;
      }

      return !currentArea || noticia.areaDestino === "Todas" || noticia.areaDestino === currentArea;
    });

  return { noticias };
});

exports.createNoticia = onCall(async (request) => {
  const authUser = request?.auth;

  if (!authUser?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear noticias.");
  }

  const payload = normalizeNewsPayload(request?.data || {});

  if (!payload.titulo || !payload.contenido || !payload.fechaLimite) {
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios de la noticia.");
  }

  const noticiaRef = await newsCollection.add({
    ...payload,
    fechaCreacion: FieldValue.serverTimestamp(),
    estado: payload.estado || "Activa",
    userId: authUser.uid,
  });

  await notifyNewsToOperators(noticiaRef.id, payload.titulo, payload.areaDestino);

  return {
    ok: true,
    id: noticiaRef.id,
  };
});

exports.updateNoticia = onCall(async (request) => {
  const authUser = request?.auth;
  const payload = request?.data || {};
  const noticiaId = payload.id;

  if (!authUser?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para actualizar noticias.");
  }

  if (!noticiaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la noticia.");
  }

  const noticiaSnapshot = await newsCollection.doc(noticiaId).get();
  if (!noticiaSnapshot.exists) {
    throw new HttpsError("not-found", "La noticia no existe.");
  }

  const cleanPayload = normalizeNewsPayload(payload);
  const { id, ...dataToUpdate } = payload;

  await newsCollection.doc(noticiaId).update({
    ...cleanPayload,
    ...dataToUpdate,
    estado: cleanPayload.estado || "Activa",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, id: noticiaId };
});

exports.deleteNoticia = onCall(async (request) => {
  const authUser = request?.auth;
  const noticiaId = request?.data?.id;

  if (!authUser?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para eliminar noticias.");
  }

  if (!noticiaId) {
    throw new HttpsError("invalid-argument", "Falta el id de la noticia.");
  }

  const noticiaSnapshot = await newsCollection.doc(noticiaId).get();
  if (!noticiaSnapshot.exists) {
    throw new HttpsError("not-found", "La noticia no existe.");
  }

  const notificationsSnap = await db
    .collection("notificaciones")
    .where("extra.noticiaId", "==", noticiaId)
    .get();

  const deletePromises = notificationsSnap.docs.map((notifDoc) => notifDoc.ref.delete());
  await Promise.all(deletePromises);
  await newsCollection.doc(noticiaId).delete();

  return { ok: true, id: noticiaId };
});


