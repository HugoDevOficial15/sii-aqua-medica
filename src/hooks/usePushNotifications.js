import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
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
      id: 'sii_aqua_canal_v5',
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


        // 3. Escuchar el token antes de registrar para no perder el evento inicial
        const unsubscribeRegistration = PushNotifications.addListener(
          'registration',
          async (token) => {

            try {
              // 1. Verificar en qué colección existe el usuario
              let userCollection = 'usuarios';
              let userRef = doc(db, 'usuarios', uidReal);
              let userSnap = await getDoc(userRef);

              const findUserByUid = async (collectionName) => {
                const usersSnapshot = await getDocs(
                  query(collection(db, collectionName), where('uid', '==', uidReal))
                );

                if (usersSnapshot.empty) return null;

                return usersSnapshot.docs[0].ref;
              };

              if (!userSnap.exists()) {
                userRef = await findUserByUid('usuarios');
                userSnap = userRef ? await getDoc(userRef) : { exists: () => false };
              }

              if (!userSnap.exists()) {
                userRef = doc(db, 'users', uidReal);
                userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                  userRef = await findUserByUid('users');
                  userSnap = userRef ? await getDoc(userRef) : { exists: () => false };
                }
                if (userSnap.exists()) {
                  userCollection = 'users';
                } else {
                  // El token puede crear el documento base si el perfil aún no existe.
                  userCollection = 'usuarios';
                  userRef = doc(db, 'usuarios', uidReal);
                }
              }

              // 2. Guardar token en la colección correcta CON el UID
              await setDoc(userRef, {
                uid: uidReal,
                fcmToken: token.value,
                fcmTokenActualizado: new Date().toISOString()
              }, { merge: true });

            } catch (errFirestore) {
              console.error('✗ Error guardando token en Firestore:',
                errFirestore.code, errFirestore.message);
            }
          }
        );

        // 4. Registrar con FCM; el listener ya está activo
        await PushNotifications.register();

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
                channelId: 'sii_aqua_canal_v5',
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
            window.dispatchEvent(new CustomEvent('sii-aqua-open-notifications'));
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
