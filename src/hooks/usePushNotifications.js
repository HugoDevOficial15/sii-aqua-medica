import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Canal de notificaciones para Android
 * Define el sonido, vibración e importancia
 * Se ejecuta cada vez que se inicia la app para asegurar que exista
 */
export const crearCanalDeNotificacion = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("ℹ No es plataforma Android, saltando creación de canal");
    return;
  }

  try {
    console.log("📢 Creando/actualizando canal de notificaciones...");

    // Crear el canal con todas las propiedades necesarias
    await LocalNotifications.createChannel({
      id: 'sii_aqua_canal_v4',
      name: 'Avisos Urgentes SII AQUA',
      description: 'Canal para notificaciones importantes y solicitudes de cambios',
      importance: 5,           // Máxima importancia (IMPORTANCE_MAX)
      visibility: 1,           // Mostrar en lockscreen (VISIBILITY_PUBLIC)
      sound: 'default',        // Sonido por defecto del sistema
      vibration: true,         // Vibración activada
      lightColor: '#0066cc',   // Color LED (azul)
    });

    console.log("✅ Canal de notificación CREADO exitosamente");
    console.log("   - ID: sii_aqua_canal_v4");
    console.log("   - Sonido: default ✓");
    console.log("   - Vibración: true ✓");
    console.log("   - Importancia: 5 (máxima) ✓");

  } catch (error) {
    // Este error es normal si el canal ya existe - Android lo ignora
    console.warn("⚠ Nota al crear canal (puede ser normal si ya existe):", error?.message || error);
  }
};

/**
 * Hook principal para notificaciones push
 * Registra el token FCM y escucha mensajes
 */
export function usePushNotifications(user) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log("ℹ No es plataforma nativa (estás en web)");
      return;
    }

    const uidReal = user?.uid;
    if (!uidReal) {
      console.log("ℹ Usuario no autenticado aún");
      return;
    }

    const registrarNotificaciones = async () => {
      try {
        // 1. Crear el canal de notificación
        await crearCanalDeNotificacion();

        // 2. Solicitar permisos
        let permStatus = await PushNotifications.checkPermissions();
        console.log("Estado actual de permisos:", permStatus);

        if (permStatus.receive === 'prompt') {
          console.log("Solicitando permisos de notificación...");
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn("✗ Permisos de notificación NO otorgados");
          return;
        }

        console.log("✓ Permisos de notificación otorgados");

        // 3. Registrar con FCM
        await PushNotifications.register();
        console.log("✓ Registrado con Firebase Cloud Messaging");

        // 4. Escuchar el token FCM (se dispara cuando se registra y cuando se renueva)
        const unsubscribeRegistration = PushNotifications.addListener(
          'registration',
          async (token) => {
            console.log('✓ TOKEN_FCM_OBTENIDO:', token?.value);
            console.log('→ Guardando token en Firestore para usuario:', uidReal);

            try {
              const userRef = doc(db, 'usuarios', uidReal);

              await setDoc(userRef, {
                fcmToken: token.value,
                fcmTokenActualizado: new Date().toISOString()
              }, { merge: true });

              console.log('✓ Token guardado en Firestore correctamente');
            } catch (errFirestore) {
              console.error('✗ Error guardando token en Firestore:',
                errFirestore.code, errFirestore.message);
            }
          }
        );

        // 5. Escuchar notificaciones que llegan (FOREGROUND)
        // Nota: En BACKGROUND/APP CERRADA, el FirebaseMessagingService de Android las maneja
        const unsubscribePushReceived = PushNotifications.addListener(
          'pushNotificationReceived',
          async (notification) => {
            console.log('📬 Notificación recibida (app en foreground):', notification);

            // Mostrar como notificación local (para mejor UX)
            await LocalNotifications.schedule({
              notifications: [{
                title: notification.title || 'SII AQUA Médica',
                body: notification.body || 'Tienes un nuevo aviso importante.',
                id: Date.now(),
                channelId: 'sii_aqua_canal_v4',
                sound: 'default',
                vibration: true,
                extra: notification.data || {}
              }]
            });
          }
        );

        // 6. Escuchar cuando el usuario hace click en notificación
        const unsubscribeAction = PushNotifications.addListener(
          'pushNotificationActionPerformed',
          async (action) => {
            console.log('👆 Usuario hizo click en notificación:', action);

            const notification = action.notification;
            const destino = notification?.data?.destino;

            if (destino) {
              console.log('→ Navegando a:', destino);
              // Usar history.push() o navigate() según tu router
              window.location.href = destino;
            }
          }
        );

        console.log("✓ Todos los listeners de notificación configurados");

        // Cleanup: Remover listeners cuando el componente se desmonta
        return () => {
          unsubscribeRegistration?.remove?.();
          unsubscribePushReceived?.remove?.();
          unsubscribeAction?.remove?.();
          console.log("🧹 Listeners de notificación removidos");
        };

      } catch (error) {
        console.error('✗ Error en registrarNotificaciones:', error);
      }
    };

    registrarNotificaciones();

  }, [user?.uid]); // Ejecutar cuando cambia el UID del usuario
}
