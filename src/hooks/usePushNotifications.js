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
    return;
  }

  try {

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


  } catch (error) {
    // Este error es normal si el canal ya existe - Android lo ignora
  }
};

/**
 * Hook principal para notificaciones push
 * Registra el token FCM y escucha mensajes
 */
export function usePushNotifications(user) {
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) {
      return;
    }

    const uidReal = user?.uid;
    if (!uidReal) {
      return;
    }

    const registrarNotificaciones = async () => {
      try {
        // 1. Crear el canal de notificación
        await crearCanalDeNotificacion();

        // 2. Solicitar permisos
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn("✗ Permisos de notificación NO otorgados");
          return;
        }


        // 3. Registrar con FCM
        await PushNotifications.register();

        // 4. Escuchar el token FCM (se dispara cuando se registra y cuando se renueva)
        const unsubscribeRegistration = PushNotifications.addListener(
          'registration',
          async (token) => {

            try {
              const userRef = doc(db, 'usuarios', uidReal);

              await setDoc(userRef, {
                fcmToken: token.value,
                fcmTokenActualizado: new Date().toISOString()
              }, { merge: true });

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

            const notification = action.notification;
            const destino = notification?.data?.destino;

            if (destino) {
              // Usar history.push() o navigate() según tu router
              window.location.href = destino;
            }
          }
        );


        // Cleanup: Remover listeners cuando el componente se desmonta
        return () => {
          unsubscribeRegistration?.remove?.();
          unsubscribePushReceived?.remove?.();
          unsubscribeAction?.remove?.();
        };

      } catch (error) {
        console.error('✗ Error en registrarNotificaciones:', error);
      }
    };

    registrarNotificaciones();

  }, [user?.uid]); // Ejecutar cuando cambia el UID del usuario
}
