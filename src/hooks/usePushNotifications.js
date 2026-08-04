import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// 🔥 NUEVO: Importamos Firebase para guardar el token
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; // Ajusta la ruta a tu firebase.js

// Ahora el hook recibe al "user" logueado
export function usePushNotifications(user) {
  useEffect(() => {
    // Si no es un dispositivo móvil o no hay usuario, no hacemos nada
    if (!Capacitor.isNativePlatform() || !user) return;

    const registrarNotificaciones = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
          console.warn('Permiso de notificaciones denegado.');
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('Token FCM corporativo obtenido: ' + token.value);
          
          // 🔥 LA CLAVE: Guardamos el token en el documento de este usuario
          try {
            // Asume que guardas a los usuarios por su username o ID. Ajusta la colección si es necesario.
            const userRef = doc(db, 'usuarios', user.username || user.uid); 
            await updateDoc(userRef, {
              fcmToken: token.value
            });
            console.log('Token guardado en Firestore exitosamente.');
          } catch (error) {
            console.error('Error al guardar el token en Firestore:', error);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error de registro FCM: ', JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('Notificación recibida: ', JSON.stringify(notification));
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.title || 'SII AQUA Médica',
                  body: notification.body || 'Tienes un nuevo aviso importante.',
                  id: new Date().getTime(),
                  sound: 'default',
                }
              ]
            });
          } catch (localError) {
            console.error('Error al disparar la alerta local:', localError);
          }
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Usuario interactuó con la notificación: ', JSON.stringify(notification));
        });

      } catch (error) {
        console.error("Error en la configuración corporativa Push:", error);
      }
    };

    registrarNotificaciones();

    // Limpieza de listeners para no duplicar alertas
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]); // El useEffect se vuelve a ejecutar si cambia el usuario
}