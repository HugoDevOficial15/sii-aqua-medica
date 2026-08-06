import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

let unsubscribe = null;

export const initPushNotifications = async (userDataOrId) => {
    // Soportamos tanto si pasas el objeto completo 'user' como si pasas solo el string del ID
    const posiblesIds = typeof userDataOrId === 'object' 
        ? [userDataOrId?.uid, userDataOrId?.id].filter(Boolean)
        : [userDataOrId].filter(Boolean);

    if (posiblesIds.length === 0) {
        console.warn("pushNotificationService: No user ID provided");
        return;
    }

    if (unsubscribe) {
        unsubscribe();
    }

    if (!Capacitor.isNativePlatform()) {
        return;
    }

    try {
        await LocalNotifications.createChannel({
            id: 'sii_aqua_canal_v3',
            name: 'Avisos Urgentes SII AQUA V3',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
        });

        // 🔑 Usamos "in" para barrer tanto el UID como el ID numérico (ej. 502)
        const q = query(
            collection(db, "notificaciones"),
            where("IdUsuario", "in", posiblesIds),
            where("enviado", "==", false)
        );

        unsubscribe = onSnapshot(q, async (snapshot) => {
            let permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display !== 'granted') {
                permStatus = await LocalNotifications.requestPermissions();
            }

            for (const docSnap of snapshot.docs) {
                const notif = docSnap.data();
                const notifId = docSnap.id;

                try {
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: notif.Titulo || "SII AQUA Médica",
                                body: notif.Mensaje || "Tienes un nuevo aviso importante.",
                                id: new Date().getTime(),
                                channelId: 'sii_aqua_canal_v3',
                                sound: 'default',
                                visibility: 1,
                                importance: 5,
                                extra: {
                                    destino: notif.Destino || null,
                                    accion: notif.Accion || null,
                                    datos: JSON.stringify(notif)
                                }
                            }
                        ]
                    });

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