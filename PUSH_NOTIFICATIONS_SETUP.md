# Setup Completo de Push Notifications 📱

## Resumen de la solución

La app ahora puede enviar notificaciones push incluso cuando está completamente cerrada. El sistema funciona en dos capas:

### 1️⃣ **Capa Inmediata (App Abierta / En Segundo Plano)**
- Service en `pushNotificationService.js` escucha en tiempo real cambios en Firestore
- Cuando detecta una notificación nueva con `enviado: false`, la envía via Capacitor PushNotifications
- Ideal para usuarios activos

### 2️⃣ **Capa Definitiva (App Completamente Cerrada)**
- ⚠️ **Requiere Cloud Function** en Firebase (ver sección abajo)
- Firebase Admin SDK envía la notificación via FCM
- Llega incluso con app completamente cerrada

---

## Implementación Actual (Ya Hecha)

### ✅ Cliente/App

1. **Service Worker** (`public/service-worker.js`)
   - Recibe push notifications incluso con app cerrada
   - Muestra la notificación en el sistema operativo

2. **Service de Notificaciones** (`src/services/pushNotificationService.js`)
   - Listener en tiempo real de Firestore
   - Detecta `notificaciones.enviado === false`
   - Envía via Capacitor

3. **Hook de Push** (`src/hooks/usePushNotifications.js`)
   - Registra el token FCM del usuario
   - Guarda el token en Firestore bajo `usuarios.fcmToken`

4. **Inicialización** (`src/main.jsx` y `src/router/AppRouter.jsx`)
   - Registra Service Worker
   - Inicia listener de notificaciones cuando usuario inicia sesión

5. **Utilidad de Notificaciones** (`src/utils/createNotification.js`)
   - Crea notificaciones con estructura estándar
   - Establece `enviado: false` automáticamente

---

## ⚠️ Paso Final: Cloud Function (Firebase)

**ESTO ES LO QUE FALTA PARA QUE FUNCIONE AL 100%**

Sin el Cloud Function, las notificaciones solo llegan:
- ✅ Cuando la app está abierta
- ✅ Cuando la app está en segundo plano
- ❌ Cuando la app está completamente cerrada

### Crear Cloud Function

1. **Instala Firebase CLI** (si no lo tienes):
   ```bash
   npm install -g firebase-tools
   ```

2. **Inicia Firebase en tu proyecto**:
   ```bash
   firebase init functions
   ```
   Selecciona tu proyecto y elige JavaScript

3. **Reemplaza `functions/index.js`** con:

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Función que se ejecuta cuando se crea una notificación
exports.sendPushNotification = functions.firestore
  .document("notificaciones/{docId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();

    // Solo procesar si no fue enviada aún
    if (notif.enviado === true) {
      console.log("Notificación ya fue enviada, saltando...");
      return;
    }

    const userId = notif.IdUsuario;

    try {
      // 1. Buscar el token FCM del usuario
      const userDoc = await db.collection("usuarios").doc(userId).get();

      if (!userDoc.exists) {
        console.error(`Usuario ${userId} no encontrado`);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.warn(
          `Usuario ${userId} no tiene token FCM. Probablemente no registró notificaciones.`
        );
        return;
      }

      // 2. Preparar el payload de la notificación
      const payload = {
        notification: {
          title: notif.Titulo || "SII AQUA Médica",
          body: notif.Mensaje || "Tienes un nuevo aviso",
        },
        data: {
          destino: notif.Destino || "",
          accion: notif.Accion || "",
          datos: JSON.stringify(notif),
        },
      };

      // 3. Enviar vía Firebase Cloud Messaging
      await messaging.sendToDevice(fcmToken, payload);

      console.log(`✓ Notificación enviada a usuario ${userId}`);

      // 4. Marcar como enviada en Firestore
      await snap.ref.update({
        enviado: true,
        fechaEnviado: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error enviando notificación:", error);

      // Reintentos automáticos según el tipo de error
      if (error.code === "messaging/invalid-registration-token") {
        // Token inválido, eliminar del usuario
        await db.collection("usuarios").doc(userId).update({
          fcmToken: admin.firestore.FieldValue.delete(),
        });
      }
    }
  });
```

4. **Instala dependencias**:
   ```bash
   cd functions
   npm install firebase-admin firebase-functions
   ```

5. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

---

## Cómo Usar en Código

### Opción A: Usar la nueva utilidad (Recomendado)

```javascript
import { createNotification } from "../utils/createNotification";

await createNotification({
  IdUsuario: user.id,
  Titulo: "Cita confirmada",
  Mensaje: "Tu cita para el 15/08 a las 10:00 ha sido confirmada",
  Destino: "/citas-medicas", // Hacia dónde navegar al tocar notif
  Accion: "ver-cita" // Acción opcional
});
```

### Opción B: Cambiar código existente

**Antes:**
```javascript
await addDoc(collection(db, "notificaciones"), {
  IdUsuario: user.id,
  Titulo: "...",
  Mensaje: "..."
});
```

**Después:**
```javascript
import { createNotification } from "../utils/createNotification";

await createNotification({
  IdUsuario: user.id,
  Titulo: "...",
  Mensaje: "..."
});
```

---

## Checklist de Verificación

- [ ] Service Worker registrado en main.jsx ✅
- [ ] `pushNotificationService.js` escucha notificaciones ✅
- [ ] Token FCM se guarda en `usuarios.fcmToken` ✅
- [ ] Nuevas notificaciones usan `createNotification()` (migrar código)
- [ ] Cloud Function deployada en Firebase ✅ (Paso final)
- [ ] Todos los `addDoc` de notificaciones migrados a `createNotification`

---

## Requisitos de Permisos en Firebase

La Cloud Function necesita permisos para:
- Leer documentos de `notificaciones`
- Leer documentos de `usuarios`
- Actualizar documentos de `notificaciones`
- Usar Firebase Cloud Messaging

Esto está automatizado si usas el Firebase CLI.

---

## Campos Requeridos en Notificaciones

```javascript
{
  IdUsuario: "uid-del-usuario",        // Requerido
  Titulo: "Título de la notificación", // Requerido
  Mensaje: "Cuerpo de la notificación", // Requerido
  Destino: "/ruta-destino",            // Opcional
  Accion: "tipo-accion",               // Opcional
  enviado: false,                       // Auto-establecido
  fechaCreacion: timestamp,            // Auto-establecido
  fechaEnviado: null                   // Auto-establecido
}
```

---

## Solución de Problemas

### 🔴 Las notificaciones no aparecen

1. **Verificar token FCM**: En Firestore, colección `usuarios`, busca tu usuario y revisa si tiene `fcmToken`
   - Si está vacío: El hook no registró el token (revisar permisos)

2. **Verificar campo `enviado`**: En Firestore, colección `notificaciones`, revisa el documento
   - Si `enviado: true`: Ya fue procesado
   - Si `enviado: false`: Está pendiente

3. **Si usas Capacitor Android**:
   - Verificar que tienes `@capacitor/push-notifications` instalado ✅
   - Verificar que Firebase Cloud Messaging está habilitado en la consola

4. **Logs**: Ver Cloud Function logs en Firebase Console → Functions

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────┐
│         Admin/Backend crea notificación         │
│   (usa createNotification() o addDoc)           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Firestore: notificaciones       │
    │  {enviado: false, ...}           │
    └──────┬──────────────┬────────────┘
           │              │
      (Firebase)    (App abierta)
           │              │
           ▼              ▼
    ┌─────────────┐  ┌──────────────────┐
    │Cloud        │  │pushNotificationS │
    │Function     │  │ervice.js         │
    │(Firebase    │  │(listener         │
    │Admin SDK)   │  │tiempo real)      │
    └─────────────┘  └──────────────────┘
           │              │
           │              │
           ▼              ▼
    ┌─────────────────────────────────┐
    │ Firebase Cloud Messaging (FCM)  │
    └──────────────────┬──────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
    ┌──────────────┐       ┌──────────────┐
    │  Android     │       │  iOS/Web     │
    │  Device      │       │  Browser     │
    └──────────────┘       └──────────────┘
           │                       │
           │                       │
      (cuando app        (Service Worker
       está cerrada)      recibe en SW)
```

---

## Migración: Cambiar todo addDoc a createNotification

Busca todos los `addDoc(collection(db, "notificaciones"), ...)` y reemplaza con `createNotification()`.

Archivos típicos:
- `src/services/citasMedicasService.js` ✅
- `src/services/agendaMedicaService.js` ✅
- `src/pages/admin/News.jsx`
- `src/pages/admin/Soporte.jsx`
- `src/services/newsService.js`
- `src/services/solicitudesCambiosService.js`

---

## Soporte

Si las notificaciones aún no aparecen:
1. Revisar Cloud Function logs en Firebase Console
2. Verificar que el token FCM está guardado en Firestore
3. Ejecutar `firebase emulate:start` para testing local
4. Revisar permisos de Firestore Security Rules

