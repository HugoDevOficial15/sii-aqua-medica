// Archivo: src/utils/felicitaciones.js
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase"; // Asegúrate de que esta ruta apunte a tu config real

export const verificarYCrearFelicitaciones = async (usuarioActual) => {
    if (!usuarioActual || !usuarioActual.id) return;

    const hoy = new Date();
    const diaActual = String(hoy.getDate()).padStart(2, '0');
    const mesActual = String(hoy.getMonth() + 1).padStart(2, '0');
    const añoActual = hoy.getFullYear();

    // 🎂 EVALUAR CUMPLEAÑOS
    if (usuarioActual.fechaNacimiento) {
        const [anioN, mesN, diaN] = usuarioActual.fechaNacimiento.split('-');
        if (mesN === mesActual && diaN === diaActual) {
            const qCumple = query(collection(db, "notificaciones"),
                where("Destino", "==", "Cumpleaños"),
                where("IdUsuario", "==", usuarioActual.id),
                where("Año", "==", añoActual)
            );
            const snapCumple = await getDocs(qCumple);
            if (snapCumple.empty) {
                await addDoc(collection(db, "notificaciones"), {
                    Titulo: "¡Feliz Cumpleaños!",
                    Mensaje: `¡Muchas felicidades, ${usuarioActual.nombre || 'compañero'}! Que tengas un excelente día. 🎉🎂`,
                    Destino: "Cumpleaños",
                    IdUsuario: usuarioActual.id,
                    Año: añoActual,
                    fechaCreacion: serverTimestamp()
                });
            }
        }
    }

    // 🏅 EVALUAR ANIVERSARIO
    if (usuarioActual.fechaIngreso) {
        const [anioI, mesI, diaI] = usuarioActual.fechaIngreso.split('-');
        if (mesI === mesActual && diaI === diaActual && anioI < añoActual) {
            const añosTrabajando = añoActual - parseInt(anioI);
            const qAniv = query(collection(db, "notificaciones"),
                where("Destino", "==", "Aniversario"),
                where("IdUsuario", "==", usuarioActual.id),
                where("Año", "==", añoActual)
            );
            const snapAniv = await getDocs(qAniv);
            if (snapAniv.empty) {
                await addDoc(collection(db, "notificaciones"), {
                    Titulo: "¡Feliz Aniversario!",
                    Mensaje: `¡Gracias por tu dedicación! Hoy cumples ${añosTrabajando} año(s) en el equipo. 🚀🏅`,
                    Destino: "Aniversario",
                    IdUsuario: usuarioActual.id,
                    Año: añoActual,
                    fechaCreacion: serverTimestamp()
                });
            }
        }
    }
};