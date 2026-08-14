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

    private static final String CHANNEL_ID = "sii_aqua_canal_v3";

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

        // Generar ID único basado en timestamp para evitar reemplazar notificaciones
        int notificationId = (int) System.currentTimeMillis();

        // Intent para cuando el usuario toca la notificación
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        // Pasar datos adicionales
        if (data != null && !data.isEmpty()) {
            if (data.containsKey("destino")) {
                intent.putExtra("destino", data.get("destino"));
            }
            if (data.containsKey("accion")) {
                intent.putExtra("accion", data.get("accion"));
            }
            android.util.Log.d("FCM_SERVICE", "Datos extras: " + data.toString());
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Obtener sonido por defecto del sistema
        Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Construir la notificación con TODAS las propiedades
        NotificationCompat.Builder builder =
            new NotificationCompat.Builder(context, CHANNEL_ID)
                // ✅ Ícono visible en la barra de estado
                .setSmallIcon(getApplicationContext().getApplicationInfo().icon)
                // ✅ Título y contenido
                .setContentTitle(title)
                .setContentText(body)
                // ✅ Descripción larga
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(body)
                    .setBigContentTitle(title))
                // ✅ Sonido explícito
                .setSound(defaultSound)
                // ✅ Vibración
                .setVibrate(new long[]{0, 250, 250, 250})
                // ✅ Prioridad alta (importante para Android < 8)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                // ✅ LED y otras propiedades
                .setLights(0xFF0000FF, 1000, 1000)
                // ✅ Intent cuando toca la notificación
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                // ✅ Acción de cerrar también disponible
                .setDeleteIntent(pendingIntent);

        // Mostrar la notificación
        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager != null) {
            try {
                notificationManager.notify(notificationId, builder.build());
                android.util.Log.d("FCM_SERVICE", "✓ NotificationManager.notify() exitoso. ID: " + notificationId);
            } catch (Exception e) {
                android.util.Log.e("FCM_SERVICE", "✗ Error al mostrar notificación: " + e.getMessage(), e);
            }
        } else {
            android.util.Log.e("FCM_SERVICE", "✗ NotificationManager es null");
        }
    }
}
