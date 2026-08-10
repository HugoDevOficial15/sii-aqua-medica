import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const crearCanalDeNotificacion = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  await LocalNotifications.createChannel({
    id: 'sii_aqua_canal_v3',
    name: 'Avisos Urgentes SII AQUA',
    description: 'Canal para notificaciones importantes y solicitudes',
    importance: 5,
    visibility: 1,
    sound: 'default',
    vibration: true,
  });
};

export function usePushNotifications(user) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Usar SOLO el UID de Firebase Authentication que viene del parámetro user
    const uidReal = user?.uid;

    // Si no hay usuario autenticado, detener la ejecución
    if (!uidReal) {
      return;
    }

    const registrarNotificaciones = async () => {
      try {
        await crearCanalDeNotificacion();

        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('TOKEN_FCM_OBTENIDO:', token?.value);
          console.log('FCM_GUARDANDO: Escribiendo token en Firestore para el usuario:', uidReal);
          
          try {
            const userRef = doc(db, 'usuarios', uidReal);
            
            await setDoc(userRef, { 
              fcmToken: token.value 
            }, { merge: true });

            console.log('FCM_EXITO: ¡Token guardado y sincronizado correctamente en Firestore!');
          } catch (errFirestore) {
            console.error('FCM_ERROR_FIRESTORE:', errFirestore.code, errFirestore.message);
          }
        });

        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          await LocalNotifications.schedule({
            notifications: [{
              title: notification.title || 'SII AQUA Médica',
              body: notification.body || 'Tienes un nuevo aviso importante.',
              id: Date.now(),
              channelId: 'sii_aqua_canal_v3',
              sound: 'default',
              extra: notification.data || {}
            }]
          });
        });

      } catch (error) {
        console.error('FCM_ERROR_GENERAL:', error);
      }
    };

    registrarNotificaciones();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);
}