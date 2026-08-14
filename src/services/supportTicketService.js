import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { createNotification } from "../utils/createNotification";

const reportesCollection = collection(db, "Problemas reportados");

// Único punto de entrada para crear una incidencia de soporte.
// ACTUALIZADO: Ya no sube archivos a Firebase Storage.
// Espera recibir la imagen (si la hay) directamente como un string Base64 en 'capturas'.
export async function createSupportTicket({
    user,
    tipoRemitente,
    asunto,
    descripcion,
    pantalla,
    capturas // 🔥 Ahora esperamos un string (Data URL en Base64), no un array de archivos.
}) {
    
    // Validamos que 'capturas' sea un string, si es undefined lo mandamos vacío
    const imagenBase64 = typeof capturas === 'string' ? capturas : "";

    const docRef = await addDoc(reportesCollection, {
        idUsuario: user?.uid || null,  // ✅ Usar Firebase UID (no user.id)
        uid: user?.uid || null,
        solicitante: user?.nombre || "ANÓNIMO",
        nomina: user?.nomina || "N/A",
        rol: user?.rol || "",
        area: user?.area || "",
        correo: user?.email || "",
        tipoRemitente: tipoRemitente || "usuario",
        asunto,
        pantalla,
        descripcion,
        capturas: imagenBase64, // 🔥 Guardamos el string Base64 directamente (como foto de perfil)
        estado: "Pendiente",
        comentarioAdmin: "",
        fecha: new Date().toLocaleDateString("es-MX"),
        fechaCreacion: serverTimestamp(),
        fechaRevision: null,
        administradorRevision: null
    });

    // 🔥 NOTIFICAR A TODOS LOS ADMINS
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const admins = usersSnapshot.docs
            .filter(doc => {
                const rol = doc.data().rol || "";
                return rol.startsWith("admin");
            })
            .map(doc => ({ uid: doc.data().uid, ...doc.data() }));

        // Enviar notificación a cada admin
        for (const admin of admins) {
            if (admin.uid) {
                await createNotification({
                    IdUsuario: admin.uid,
                    Titulo: "🚨 Nuevo Reporte de Problema",
                    Mensaje: `${user?.nombre || "Un usuario"} reportó: "${asunto}"`,
                    Destino: "support",
                    Accion: "nuevo_reporte",
                    extra: {
                        reporteId: docRef.id,
                        solicitante: user?.nombre,
                        asunto: asunto,
                        pantalla: pantalla
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error al notificar a admins sobre el reporte:", error);
        // No lanzamos el error para que el reporte se haya creado aunque falle la notificación
    }

    return { success: true, id: docRef.id };
}