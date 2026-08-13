// Archivo: src/utils/felicitaciones.js
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase"; // Asegúrate de que esta ruta apunte a tu config real

export const verificarYCrearFelicitaciones = async (usuarioActual) => {
    const usuarioId = usuarioActual?.uid || usuarioActual?.id;
    if (!usuarioActual || !usuarioId) {
        console.warn("⚠️ verificarYCrearFelicitaciones: Usuario o ID vacío", { usuarioActual, usuarioId });
        return;
    }

    const hoy = new Date();
    const diaActual = String(hoy.getDate()).padStart(2, '0');
    const mesActual = String(hoy.getMonth() + 1).padStart(2, '0');
    const añoActual = hoy.getFullYear();

    console.log("🎂 Verificando felicitaciones para:", {
        nombreUsuario: usuarioActual.nombre,
        usuarioId,
        hoy: `${diaActual}/${mesActual}/${añoActual}`,
        fechaNacimiento: usuarioActual.fechaNacimiento,
        fechaIngreso: usuarioActual.fechaIngreso
    });

    // 🎂 EVALUAR CUMPLEAÑOS
    if (usuarioActual.fechaNacimiento) {
        const [anioN, mesN, diaN] = usuarioActual.fechaNacimiento.split('-');
        console.log("  📅 Cumpleaños:", { anioN, mesN, diaN, mesActual, diaActual });

        if (mesN === mesActual && diaN === diaActual) {
            console.log("  ✅ ¡Es cumpleaños hoy!");
            try {
                // Usar una ID única para evitar duplicados por condiciones de carrera
                const cumpleUniqueId = `cumpleaños_${usuarioId}_${diaActual}_${mesActual}_${añoActual}`;

                const qCumple = query(collection(db, "notificaciones"),
                    where("Destino", "==", "Cumpleaños"),
                    where("IdUsuario", "==", usuarioId),
                    where("diaActual", "==", diaActual),
                    where("mesActual", "==", mesActual),
                    where("Año", "==", añoActual)
                );
                const snapCumple = await getDocs(qCumple);

                if (snapCumple.empty) {
                    console.log("  📝 Creando notificación de cumpleaños...");
                    await addDoc(collection(db, "notificaciones"), {
                        Titulo: "¡Feliz Cumpleaños!",
                        Mensaje: `¡Muchas felicidades, ${usuarioActual.nombre || 'compañero'}! Que tengas un excelente día. 🎉🎂`,
                        Destino: "Cumpleaños",
                        IdUsuario: usuarioId,
                        Año: añoActual,
                        diaActual: diaActual,
                        mesActual: mesActual,
                        uniqueId: cumpleUniqueId,
                        fechaCreacion: serverTimestamp()
                    });
                    console.log("  ✅ Notificación de cumpleaños creada");
                } else {
                    console.log("  ℹ️ Ya existe notificación de cumpleaños para este año");
                }
            } catch (error) {
                console.error("  ❌ Error al crear notificación de cumpleaños:", error);
            }
        }
    }

    // 🏅 EVALUAR ANIVERSARIO
    if (usuarioActual.fechaIngreso) {
        const [anioI, mesI, diaI] = usuarioActual.fechaIngreso.split('-');
        console.log("  🏅 Aniversario:", { anioI, mesI, diaI, mesActual, diaActual });

        if (mesI === mesActual && diaI === diaActual && anioI < añoActual) {
            const añosTrabajando = añoActual - parseInt(anioI);
            console.log("  ✅ ¡Es aniversario hoy! Años trabajando:", añosTrabajando);
            try {
                // Usar una ID única para evitar duplicados por condiciones de carrera
                const anivUniqueId = `aniversario_${usuarioId}_${diaActual}_${mesActual}_${añoActual}`;

                const qAniv = query(collection(db, "notificaciones"),
                    where("Destino", "==", "Aniversario"),
                    where("IdUsuario", "==", usuarioId),
                    where("diaActual", "==", diaActual),
                    where("mesActual", "==", mesActual),
                    where("Año", "==", añoActual)
                );
                const snapAniv = await getDocs(qAniv);

                if (snapAniv.empty) {
                    console.log("  📝 Creando notificación de aniversario...");
                    await addDoc(collection(db, "notificaciones"), {
                        Titulo: "¡Feliz Aniversario!",
                        Mensaje: `¡Gracias por tu dedicación! Hoy cumples ${añosTrabajando} año(s) en el equipo. 🚀🏅`,
                        Destino: "Aniversario",
                        IdUsuario: usuarioId,
                        Año: añoActual,
                        diaActual: diaActual,
                        mesActual: mesActual,
                        uniqueId: anivUniqueId,
                        fechaCreacion: serverTimestamp()
                    });
                    console.log("  ✅ Notificación de aniversario creada");
                } else {
                    console.log("  ℹ️ Ya existe notificación de aniversario para este año");
                }
            } catch (error) {
                console.error("  ❌ Error al crear notificación de aniversario:", error);
            }
        }
    }
};