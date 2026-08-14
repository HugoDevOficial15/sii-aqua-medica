import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';

/**
 * Hook que escucha mensajes FCM cuando la app está en FOREGROUND
 * El service worker maneja los mensajes en background
 */
export function useFirebaseMessaging() {
  useEffect(() => {
    if (!messaging) {
      console.warn("⚠ Firebase Messaging no disponible");
      return;
    }

    try {
      // Escuchar mensajes cuando la app está visible
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("✓ Mensaje FCM recibido en foreground:", payload);

        // Enviar al service worker para mostrar notificación
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SHOW_NOTIFICATION",
            payload: payload
          });
        }

        // Opcional: Mostrar notificación local o toast
        if (payload.notification) {
          // Aquí podrías mostrar un toast o notificación local
          console.log("📬 Notificación:", {
            title: payload.notification.title,
            body: payload.notification.body
          });
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("✗ Error configurando Firebase Messaging:", error);
    }
  }, []);
}
