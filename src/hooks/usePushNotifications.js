import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
// 🔥 Cambiamos updateDoc por setDoc
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export function usePushNotifications(user) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const registrarNotificaciones = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('TOKEN_FCM_OBTENIDO:', token?.value);
          
          const uidReal = user?.uid || user?.id || JSON.parse(localStorage.getItem("auth") || "{}")?.uid || JSON.parse(localStorage.getItem("auth") || "{}")?.id;
          
          if (!uidReal) {
            console.log('FCM_ERROR: No se encontró ningún UID de usuario disponible.');
            return;
          }

          console.log('FCM_GUARDANDO: Escribiendo token en Firestore para el usuario:', uidReal);
          
          try {
            const userRef = doc(db, 'usuarios', uidReal);
            
            // 🔥 Usamos setDoc con { merge: true } para crear el documento si no existe o actualizarlo si ya existe
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
              sound: 'default'
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