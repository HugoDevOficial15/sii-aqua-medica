import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../services/firebaseConfig"; // Ajusta tu ruta

export const crearNoticia = async (titulo, contenido, archivoImagen) => {
  try {
    let imagenUrl = "";

    // 1. Si hay imagen, la subimos a Firebase Storage primero
    if (archivoImagen) {
      // Creamos una referencia única para la imagen
      const imageRef = ref(storage, `noticias/${Date.now()}_${archivoImagen.name}`);
      const uploadResult = await uploadBytes(imageRef, archivoImagen);
      // Obtenemos el link público para mostrarla
      imagenUrl = await getDownloadURL(uploadResult.ref);
    }

    // 2. Guardamos los datos de la noticia en Firestore
    const docRef = await addDoc(collection(db, "noticias"), {
      titulo: titulo,
      contenido: contenido,
      imagenUrl: imagenUrl, // Se guarda el link que generó Storage
      fechaCreacion: serverTimestamp(),
      autor: "Administrador"
    });

    // 3. Disparamos la notificación general para los usuarios (AQUA News)
    await addDoc(collection(db, "notificaciones"), {
      tipo: "news",
      titulo: "AQUA News",
      mensaje: "Nuevo comunicado disponible.",
      fecha: serverTimestamp(),
      leido: false,
      noticiaId: docRef.id,
      ruta: "/news"
    });

    return true;
  } catch (error) {
    console.error("Error al crear la noticia:", error);
    throw error;
  }
};