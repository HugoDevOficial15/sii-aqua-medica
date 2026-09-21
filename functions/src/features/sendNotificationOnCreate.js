const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { db, admin } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

// Dispara un mensaje FCM cuando se crea un documento en la colección
// `notificaciones` dirigido a un `IdUsuario` que tenga `fcmToken`.
exports.sendNotificationOnCreate = onDocumentCreated("notificaciones/{notifId}", async (event) => {
    try {
        const snap = event.data;
        if (!snap) return;

        const notif = typeof snap.data === 'function' ? snap.data() : snap.data;
        const notifId = snap.id;

        if (!notif) return;

        // Solo enviamos notificaciones dirigidas a un usuario específico
        const destinatario = notif.IdUsuario;
        if (!destinatario) return;

        // Intentamos leer el token FCM del usuario
        // Buscar en ambas colecciones (usuarios y users) por compatibilidad
        let token = null;
        let userRef = db.collection("usuarios").doc(String(destinatario));
        let userSnap = await userRef.get();
        let userData = userSnap.exists ? userSnap.data() : null;

        if (!userData) {
            const usersByUid = await db.collection("usuarios")
                .where("uid", "==", String(destinatario))
                .limit(1)
                .get();
            if (!usersByUid.empty) {
                userSnap = usersByUid.docs[0];
                userRef = userSnap.ref;
                userData = userSnap.data();
            }
        }

        if (userData) {
            token = userData.fcmToken;
        } else {
            // Si no encuentra en usuarios, buscar en users
            userRef = db.collection("users").doc(String(destinatario));
            userSnap = await userRef.get();
            userData = userSnap.exists ? userSnap.data() : null;
            if (!userData) {
                const usersByUid = await db.collection("users")
                    .where("uid", "==", String(destinatario))
                    .limit(1)
                    .get();
                if (!usersByUid.empty) {
                    userSnap = usersByUid.docs[0];
                    userRef = userSnap.ref;
                    userData = userSnap.data();
                }
            }
            if (userData) {
                token = userData.fcmToken;
            }
        }

        if (!token) {
            console.log(`No FCM token for user ${destinatario}, skipping.`);
            return;
        }

        const message = {
            token,
            notification: {
                title: String(notif.Titulo || "SII AQUA Médica"),
                body: String(notif.Mensaje || "Tienes un nuevo aviso."),
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "sii_aqua_canal_v5",
                    sound: "default",
                },
            },
            data: {
                title: String(notif.Titulo || "SII AQUA Médica"),
                body: String(notif.Mensaje || "Tienes un nuevo aviso."),
                destino: String(notif.Destino || ""),
                accion: String(notif.Accion || ""),
                open_notifications: "true"
            }
        };

        const response = await admin.messaging().send(message);

        // Marcamos la notificación como enviada por el servidor
        await db.collection("notificaciones").doc(notifId).update({
            enviado: true,
            fechaEnviado: FieldValue.serverTimestamp(),
            enviadoPorServidor: true,
            messagingId: response
        });

        console.log(`Notification ${notifId} sent via FCM to user ${destinatario}. msgId=${response}`);

    } catch (error) {
        console.error("Error sending FCM notification:", error);
    }
});
