import './App.css';

// Router
import AppRouter from './router/AppRouter';
// Auth Provider
import { AuthProvider } from './context/AuthProvider';
// Context Loader
import { LoaderProvider } from './context/LoaderProvider';
// Preferencias (tema y tamaño de texto)
import { PreferencesProvider } from './context/PreferencesProvider';
import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Hook corporativo para Push Notifications y Branding de la Empresa
export function usePushNotifications() {
  useEffect(() => {
    const registrarNotificaciones = async () => {
      try {
        // 1. Validación de permisos nativos
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
          console.warn('Permiso de notificaciones denegado.');
          return;
        }

        // 2. Registro en Firebase Cloud Messaging
        await PushNotifications.register();

        // 3. Listeners de eventos Push
        PushNotifications.addListener('registration', (token) => {
          console.log('Token FCM corporativo obtenido: ' + token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error de registro FCM: ', JSON.stringify(error));
        });

        // Recepción en primer plano: Disparador directo con canal estándar para forzar sonido y burbuja flotante
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

        // Cuando el usuario interactúa con la notificación
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Usuario interactuó con la notificación: ', JSON.stringify(notification));
        });

      } catch (error) {
        console.error("Error en la configuración corporativa Push:", error);
      }
    };

    if (Capacitor.isNativePlatform()) {
      registrarNotificaciones();
    }
  }, []);
}

// Componente Raíz
function App() {
  usePushNotifications();

  return (
    <PreferencesProvider>
      <AuthProvider>
        <LoaderProvider>
          <AppRouter />
        </LoaderProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}

export default App;