import { getFirestore, collection, setDoc, doc, serverTimestamp, getDocs, deleteDoc } from "firebase/firestore";

/**
 * Script de prueba para simular la publicación de un menú
 * Esto crea una notificación manualmente sin necesidad de desplegar las Cloud Functions
 */
export const simularPublicacionMenu = async () => {
  try {
    const db = getFirestore();

    const notificacionTest = {
      tipo: "MENU_PUBLICADO",
      titulo: "Nuevo Menú Publicado (TEST)",
      mensaje: "Se ha publicado el menú para la semana 30.09.2026 - 06.10.2026",
      semana: "30.09.2026 - 06.10.2026",
      semanaId: "test-" + Date.now(),
      timestamp: serverTimestamp(),
      leido: false,
      datos: {
        desayunos: ["Café con pan", "Huevos revueltos", "Fruta"],
        comidas: ["Sopa de verduras", "Pollo guisado", "Arroz blanco"],
        cenas: ["Quesadillas", "Ensalada", "Bebida"],
      },
    };

    // Guardar notificación en Firestore
    await setDoc(
      doc(db, "Notificaciones", notificacionTest.semanaId),
      notificacionTest
    );

    console.log("✓ Notificación de prueba creada exitosamente");
    console.log("ID de notificación:", notificacionTest.semanaId);
    return notificacionTest;
  } catch (error) {
    console.error("✗ Error al crear notificación de prueba:", error);
    throw error;
  }
};

/**
 * Limpia las notificaciones de prueba
 */
export const limpiarNotificacionesTest = async () => {
  try {
    const db = getFirestore();

    // Obtener todas las notificaciones de prueba
    const notificacionesRef = collection(db, "Notificaciones");
    const snapshot = await getDocs(notificacionesRef);

    let eliminadas = 0;
    for (const doc of snapshot.docs) {
      if (doc.data().semanaId?.includes("test-")) {
        await deleteDoc(doc.ref);
        eliminadas++;
      }
    }

    console.log(`✓ Se eliminaron ${eliminadas} notificaciones de prueba`);
  } catch (error) {
    console.error("✗ Error limpiando notificaciones de test:", error);
  }
};
