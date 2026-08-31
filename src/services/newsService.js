import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../services/firebaseConfig"; // Ajusta tu ruta
import { createNotification } from "../utils/createNotification";

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

    // 3. Disparamos la notificación solo a usuarios activos
    const activeUsersQuery = query(
      collection(db, "usuarios"),
      where("activo", "==", true)
    );
    const usersSnapshot = await getDocs(activeUsersQuery);

    const notificacionesPromises = usersSnapshot.docs.map(userDoc => {
      const userId = userDoc.id;
      return createNotification({
        IdUsuario: userId,
        Titulo: "📰 Nueva noticia",
        Mensaje: titulo || "Nuevo comunicado disponible.",
        Destino: "/news",
        extra: {
          tipo: "news",
          noticiaId: docRef.id,
          imagenUrl: imagenUrl || null
        }
      }).catch(error => {
        console.error(`Error creando notificación para usuario ${userId}:`, error);
      });
    });

    await Promise.all(notificacionesPromises);

    return true;
  } catch (error) {
    console.error("Error al crear la noticia:", error);
    throw error;
  }
};