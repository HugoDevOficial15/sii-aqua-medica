# Guía Práctica: Probar Push Notifications 📱

## Opción A: Prueba Rápida (Sin Cloud Function)

### ✅ Requisito
La app debe estar abierta o en segundo plano

### Pasos:

1. **Abre la app en tu navegador o dispositivo**
   ```
   npm run dev
   # O en Capacitor Android
   ```

2. **Inicia sesión** con tu usuario

3. **Abre la consola del navegador** (F12 → Console)
   - Deberías ver: `✓ Service Worker registrado`
   - Y: `Push notifications listener detenido` (al logout)

4. **Crea una notificación de prueba manualmente** en Firestore:
   ```javascript
   // Desde la consola del navegador (copia en DevTools Console):
   
   import { addDoc, collection } from "firebase/firestore";
   import { db } from "./src/config/firebase";
   
   const user = JSON.parse(localStorage.getItem("auth") || "{}");
   
   await addDoc(collection(db, "notificaciones"), {
     IdUsuario: user.uid,  // Tu UID
     Titulo: "Test 🔥",
     Mensaje: "Si ves esto, ¡funciona!",
     Destino: "/dashboard",
     enviado: false,
     fechaCreacion: new Date()
   });
   ```

5. **Si la app está abierta**, deberías ver:
   - ✅ Una notificación del sistema
   - ✅ En Firestore: `enviado: true` automáticamente

---

## Opción B: Prueba Completa (Con Cloud Function)

### ✅ Requisitos
- Firebase CLI instalado
- Project ID de tu Firebase
- Cloud Function deployada

### Pasos:

1. **Verifica tu proyecto ID**:
   ```bash
   firebase projects:list
   ```

2. **Copia el Cloud Function** del archivo `PUSH_NOTIFICATIONS_SETUP.md`

3. **Crea la función en `functions/index.js`**:
   ```bash
   firebase init functions  # Si no existe
   # Edita functions/index.js con el código del SETUP.md
   ```

4. **Instala dependencias**:
   ```bash
   cd functions
   npm install
   cd ..
   ```

5. **Deploy a Firebase**:
   ```bash
   firebase deploy --only functions
   ```

6. **Verifica que la función se deployó**:
   ```bash
   firebase functions:list
   # Deberías ver: sendPushNotification
   ```

7. **Ahora crea una notificación** en Firestore (igual que Opción A)

8. **La notificación llegará incluso si**:
   - ✅ La app está cerrada
   - ✅ El dispositivo está bloqueado
   - ✅ El usuario está en otra app

---

## Prueba 2: Verificar Token FCM

### Pasos:

1. **Abre tu proyecto en Firebase Console**
   - Ve a: `Firestore Database`
   - Colección: `usuarios`
   - Abre tu documento de usuario

2. **Busca el campo `fcmToken`**
   ```
   {
     nombre: "Tu Nombre",
     email: "tu@email.com",
     fcmToken: "eXw2i4uK7pQrZ9nM..." // ← Debe estar aquí
   }
   ```

3. **Si está vacío**, quiere decir:
   - ❌ El hook `usePushNotifications` no se ejecutó
   - ❌ Verificar permisos en Firestore Security Rules
   - ❌ Verificar que estás en plataforma nativa (Capacitor Android/iOS)

---

## Prueba 3: Ver Logs en Tiempo Real

### En desarrollo local:

```bash
# Terminal 1: Emulator de Firestore
firebase emulators:start

# Terminal 2: Tu app
npm run dev

# Terminal 3: Ver logs de Cloud Function (si ya está deployada)
firebase functions:log
```

### En Firestore Console (production):

1. Firebase Console → Functions
2. Abre la función `sendPushNotification`
3. Tab "Logs" mostrará cada invocación
4. Si hay errores, aparecerán aquí

---

## Prueba 4: Simular Desde Código React

### Archivo de prueba: `src/pages/TestPushNotifications.jsx`

```jsx
import { useState } from "react";
import { createNotification } from "../utils/createNotification";
import { useAuth } from "../hooks/useAuth";
import { notifySuccess, notifyError } from "../utils/notify";

export default function TestPushNotifications() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleTestNotification = async () => {
    if (!user?.id && !user?.uid) {
      notifyError("Error", "No hay usuario autenticado");
      return;
    }

    setLoading(true);
    try {
      await createNotification({
        IdUsuario: user.id || user.uid,
        Titulo: "🧪 Notificación de Prueba",
        Mensaje: `Enviada a las ${new Date().toLocaleTimeString()}`,
        Destino: "/dashboard",
        Accion: "test"
      });

      notifySuccess("✅ Éxito", "Notificación creada. Revisa Firestore.");
    } catch (error) {
      console.error(error);
      notifyError("❌ Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h3>🧪 Test Push Notifications</h3>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleTestNotification}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0A4D9D",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? "Enviando..." : "Enviar Notificación de Prueba"}
        </button>
      </div>

      <div style={{ marginTop: "20px", color: "#666" }}>
        <h4>Checklist:</h4>
        <ul>
          <li>✓ Usuario actual: <code>{user?.email || user?.nombre}</code></li>
          <li>✓ UID: <code>{user?.id || user?.uid}</code></li>
          <li>□ Token FCM guardado en Firestore</li>
          <li>□ Notificación creada con enviado: false</li>
          <li>□ Service Worker está registrado</li>
          <li>□ Cloud Function enviando (si está deployada)</li>
        </ul>
      </div>

      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
        <strong>💡 Pasos después de hacer clic:</strong>
        <ol>
          <li>Ir a Firebase Console → Firestore → notificaciones</li>
          <li>Busca el documento más nuevo</li>
          <li>Verifica que <code>enviado: false</code> cambió a <code>enviado: true</code></li>
          <li>Revisa que el campo <code>fechaEnviado</code> se llenó</li>
        </ol>
      </div>
    </div>
  );
}
```

### Usar la página de prueba:

1. **Agrega la ruta** en `AppRouter.jsx`:
```jsx
<Route path="/test-push" element={<TestPushNotifications />} />
```

2. **Accede**: `http://localhost:5173/test-push`

3. **Haz clic en el botón** y observa Firestore

---

## Prueba 5: En Dispositivo Android Real

### ✅ Requisitos
- Dispositivo Android con la app instalada vía Capacitor
- Usuario autenticado
- Internet activa

### Pasos:

1. **Instala la app**:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   # Compila en Android Studio y instala en el device
   ```

2. **Abre la app y inicia sesión**

3. **Revisa Logcat** (en Android Studio):
   ```
   adb logcat | grep -i "push\|notification\|fcm"
   ```
   Deberías ver:
   ```
   ✓ Token FCM corporativo obtenido: eXw2i4uK...
   ✓ Notificación recibida
   ```

4. **Cierra la app completamente**

5. **Desde Firebase Console, crea una notificación** (igual que antes)

6. **Deberías recibir la notificación** incluso con app cerrada

---

## Checklist de Verificación

- [ ] Service Worker registrado (ver Console del navegador)
- [ ] Token FCM guardado en `usuarios.fcmToken`
- [ ] Notificación en Firestore con `enviado: false` se cambia a `true` automáticamente
- [ ] Si app está abierta: notificación aparece en el sistema
- [ ] Si app está cerrada pero Cloud Function deployed: notificación sigue llegando
- [ ] Logs de Cloud Function muestran `✓ Notificación enviada`

---

## Errores Comunes y Soluciones

### ❌ "Token FCM está vacío"
```
Causa: usePushNotifications no se ejecutó
Solución: 
  1. Verificar que estás en una plataforma nativa (Capacitor)
  2. Revisar permisos en Android: Settings → Apps → Permisos
  3. Revisar Firestore Security Rules (si se puede escribir en usuarios)
```

### ❌ "Notificación no aparece con app cerrada"
```
Causa: No hay Cloud Function deployada
Solución:
  1. Seguir pasos de "Opción B: Prueba Completa"
  2. Ejecutar: firebase deploy --only functions
  3. Ver logs: firebase functions:log
```

### ❌ "Cloud Function dice 'Usuario no encontrado'"
```
Causa: El IdUsuario en la notificación no coincide con la colección usuarios
Solución:
  1. Usar createNotification() con user.id o user.uid correcto
  2. Verificar que el documento existe en Firestore: usuarios/{uid}
```

### ❌ "enviado: false no cambia a true"
```
Causa: El servicio pushNotificationService no está corriendo
Solución:
  1. Verificar que AppRouter inicializó initPushNotifications
  2. Ver Console del navegador para errores
  3. Verificar que el usuario tiene ID válido
```

---

## Prueba Rápida de 2 Minutos

```bash
# 1. Abre la app
npm run dev

# 2. Abre DevTools y pega esto en la consola:
const userId = JSON.parse(localStorage.getItem("auth") || "{}").uid || "test-user";
fetch('/api/test-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
});

# 3. Espera 2-3 segundos
# 4. Deberías recibir una notificación
```

---

## Video de Demostración (Pasos Simulados)

```
1. Usuario inicia sesión
   ↓
2. usePushNotifications se ejecuta
   ↓ Token FCM guardado en Firestore
   ↓
3. Admin crea una notificación
   ↓
4. Cloud Function detecta cambio
   ↓
5. FCM envía al dispositivo
   ↓
6. Service Worker recibe (app cerrada)
   ↓
7. Notificación en bandeja del sistema
   ↓ Usuario toca
   ↓
8. App abre en la ruta de destino
```

---

## Soporte

Si algo no funciona:
1. Revisar `firebase functions:log`
2. Ver Console del navegador (F12)
3. Verificar campos en Firestore
4. Confirmar que `enviado: false` existe en la notificación
