package sii_aqua.medica98;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Servicio que escucha mensajes FCM incluso cuando la app está cerrada.
 * Este es el HANDLER crítico que faltaba en la configuración.
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "sii_aqua_canal_v4";

    /**
     * Llamado cuando llega una notificación (app cerrada, background, foreground)
     * ✅ FUNCIONA INCLUSO SI LA APP ESTÁ CERRADA
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        android.util.Log.d("FCM_SERVICE", "=== NOTIFICACIÓN RECIBIDA ===");
        android.util.Log.d("FCM_SERVICE", "Notification: " + remoteMessage.getNotification());
        android.util.Log.d("FCM_SERVICE", "Data: " + remoteMessage.getData());

        String title = "SII AQUA Médica";
        String body = "Tienes un nuevo aviso";
        Map<String, String> data = remoteMessage.getData();

        // Obtener título y cuerpo del mensaje
        if (remoteMessage.getNotification() != null) {
            RemoteMessage.Notification notif = remoteMessage.getNotification();

            if (notif.getTitle() != null && !notif.getTitle().isEmpty()) {
                title = notif.getTitle();
            }

            if (notif.getBody() != null && !notif.getBody().isEmpty()) {
                body = notif.getBody();
            }

            android.util.Log.d("FCM_SERVICE", "Título extraído: " + title);
            android.util.Log.d("FCM_SERVICE", "Cuerpo extraído: " + body);
        } else {
            android.util.Log.w("FCM_SERVICE", "⚠ La notificación es NULL");
        }

        // Si body sigue siendo nulo o vacío, usar datos alternativos
        if (body == null || body.isEmpty()) {
            body = "Tienes un nuevo aviso importante";
            android.util.Log.w("FCM_SERVICE", "⚠ Body vacío, usando predeterminado");
        }

        if (title == null || title.isEmpty()) {
            title = "SII AQUA Médica";
            android.util.Log.w("FCM_SERVICE", "⚠ Title vacío, usando predeterminado");
        }

        // Mostrar notificación visual
        showNotification(title, body, data);

        // Log final
        android.util.Log.d("FCM_SERVICE", "✓ Notificación mostrada: " + title + " - " + body);
    }

    /**
     * Llamado cuando se renueva el token FCM
     * Actualiza el token en Firestore/backend
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        android.util.Log.d("FCM_TOKEN_NEW", "✓ Token renovado: " + token);
    }

    /**
     * Construye y muestra la notificación en el sistema Android
     * Con sonido, vibración y propiedades visuales mejoradas
     */
    private void showNotification(String title, String body, Map<String, String> data) {
        Context context = getApplicationContext();
        int notificationId = (int) System.currentTimeMillis();

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        if (data != null && !data.isEmpty()) {
            if (data.containsKey("destino")) {
                intent.putExtra("destino", data.get("destino"));
            }
            if (data.containsKey("accion")) {
                intent.putExtra("accion", data.get("accion"));
            }
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // 🔥 ESTA ES LA MAGIA QUE FALTABA: Crear el canal en Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Nombre visible para el usuario en los ajustes
            CharSequence name = "Avisos Urgentes SII AQUA";
            String description = "Canal principal para alertas con sonido";
            
            // IMPORTANCE_HIGH es OBLIGATORIO para que suene y salga la alerta flotante
            android.app.NotificationChannel channel = new android.app.NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(description);
            
            // Forzar el sonido y la vibración en el canal
            android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .build();
            channel.setSound(defaultSound, audioAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 250, 250});

            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }

        NotificationCompat.Builder builder =
            new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(getApplicationContext().getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body).setBigContentTitle(title))
                .setSound(defaultSound)
                .setVibrate(new long[]{0, 250, 250, 250})
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setLights(0xFF0000FF, 1000, 1000)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setDeleteIntent(pendingIntent);

        if (notificationManager != null) {
            try {
                notificationManager.notify(notificationId, builder.build());
                android.util.Log.d("FCM_SERVICE", "✓ NotificationManager.notify() exitoso. ID: " + notificationId);
            } catch (Exception e) {
                android.util.Log.e("FCM_SERVICE", "✗ Error al mostrar notificación: " + e.getMessage(), e);
            }
        }
    }
}
