const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { db, admin } = require("../../config/firebase");

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
        const userRef = db.collection("users").doc(String(destinatario));
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : null;
        const token = userData?.fcmToken;

        if (!token) {
            console.log(`No FCM token for user ${destinatario}, skipping.`);
            return;
        }

        const message = {
            token,
            notification: {
                title: notif.Titulo || "SII AQUA Médica",
                body: notif.Mensaje || "Tienes un nuevo aviso."
            },
            android: {
                notification: {
                    sound: "default", 
                    channelId: "sii_aqua_canal_v4" // <-- Fíjate en este valor
                }
            },
            data: {
                destino: String(notif.Destino || ""),
                accion: String(notif.Accion || "")
            }
        };

        const response = await admin.messaging().send(message);

        // Marcamos la notificación como enviada por el servidor
        await db.collection("notificaciones").doc(notifId).update({
            enviado: true,
            fechaEnviado: admin.firestore.FieldValue.serverTimestamp(),
            enviadoPorServidor: true,
            messagingId: response
        });

        console.log(`Notification ${notifId} sent via FCM to user ${destinatario}. msgId=${response}`);

    } catch (error) {
        console.error("Error sending FCM notification:", error);
    }
});
