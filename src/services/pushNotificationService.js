// ============================================================
// Servicio centralizado de Push Notifications
// Detecta nuevas notificaciones en Firestore y muestra
// alertas locales en el dispositivo usando Capacitor.
// ============================================================

import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

let unsubscribe = null;

export const initPushNotifications = (userIdUsuario) => {

    if (!userIdUsuario) {
        console.warn("pushNotificationService: No user ID provided");
        return;
    }

    if (unsubscribe) {
        unsubscribe();
    }

    if (!Capacitor.isNativePlatform()) {
        console.log("pushNotificationService: Not a native platform, skipping setup");
        return;
    }

    try {
        const q = query(
            collection(db, "notificaciones"),
            where("IdUsuario", "==", userIdUsuario),
            where("enviado", "==", false)
        );

        unsubscribe = onSnapshot(q, async (snapshot) => {

            // Solicitamos permisos de notificaciones locales por seguridad
            let permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display !== 'granted') {
                permStatus = await LocalNotifications.requestPermissions();
            }

            for (const docSnap of snapshot.docs) {
                const notif = docSnap.data();
                const notifId = docSnap.id;

                try {
                    // Disparamos la notificación localmente en el dispositivo
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: notif.Titulo || "SII AQUA Médica",
                                body: notif.Mensaje || "Tienes un nuevo aviso importante.",
                                id: new Date().getTime(),
                                sound: 'default',
                                extra: {
                                    destino: notif.Destino || null,
                                    accion: notif.Accion || null,
                                    datos: JSON.stringify(notif)
                                }
                            }
                        ]
                    });

                    // Marcar como enviado en Firestore para que no se repita
                    const notifRef = doc(db, "notificaciones", notifId);
                    await updateDoc(notifRef, {
                        enviado: true,
                        fechaEnviado: new Date()
                    });

                    console.log(`✓ Notificación ${notifId} procesada y mostrada con éxito.`);

                } catch (error) {
                    console.error(`✗ Error procesando notificación ${notifId}:`, error);
                }
            }

        }, (error) => {
            console.error("Error en listener de notificaciones:", error);
        });

    } catch (error) {
        console.error("Error inicializando push notifications:", error);
    }
};

export const stopPushNotifications = () => {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
        console.log("Push notifications listener detenido");
    }
};