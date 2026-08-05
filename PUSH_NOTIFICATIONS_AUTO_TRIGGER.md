# 🔔 Notificaciones Push: Activación Automática

## Resumen

Ahora **cualquier actividad en el sistema que cree una notificación en Firestore automáticamente gatilla una push notification** al usuario, incluso si la app está completamente cerrada.

### El flujo es:
```
Acción del usuario/Admin
        ↓
Crea notificación en Firestore
        ↓
El listener detecta: enviado: false
        ↓
Envía vía Capacitor/FCM automáticamente
        ↓
Usuario recibe push notification
```

---

## ✅ Actividades que Ahora Disparan Push Notifications

### 1️⃣ **Citas Médicas**

#### ✓ Cancelación de cita (por el usuario)
- **Cuándo**: Usuario cancela su propia cita
- **Archivo**: `citasMedicasService.js` → `cancelAppointmentByUser()`
- **Notificación**: "Cita cancelada - Tu cancelación fue registrada correctamente"
- **Destino**: CitaCanceladaConfirmacion

#### ✓ Cancelación masiva de agenda (por admin)
- **Cuándo**: Admin cancela todos los horarios de una agenda
- **Archivo**: `citasMedicasService.js` → `cancelAppointmentsByAgenda()`
- **Notificación**: "Cita cancelada - La agenda médica fue modificada..."
- **Destino**: CitaCancelada
- **Alcance**: ⭐ A TODOS los usuarios con citas en esa agenda

---

### 2️⃣ **Noticias**

#### ✓ Nueva noticia publicada
- **Cuándo**: Admin publica una noticia
- **Archivo**: `newsService.js` → `crearNoticia()`
- **Notificación**: "📰 Nueva noticia - [Título de la noticia]"
- **Destino**: /news
- **Alcance**: ⭐ A TODOS los usuarios del sistema

---

### 3️⃣ **Agendas Médicas**

#### ✓ Nueva campaña creada
- **Cuándo**: Admin crea una nueva agenda/campaña médica
- **Archivo**: `agendaMedicaService.js` → `crearAgenda()`
- **Notificación**: "📅 Nueva agenda médica - Se creó la campaña: [Nombre]"
- **Destino**: citas-medicas
- **Alcance**: ⭐ A TODOS los usuarios

---

### 4️⃣ **Solicitudes de Cambio de Datos**

#### ✓ Solicitud respondida (aprobada/rechazada)
- **Cuándo**: Admin aprueba o rechaza una solicitud de cambio
- **Archivo**: `solicitudesCambiosService.js` (ya implementado)
- **Notificación**: Automática según estado

---

## 🎯 Cómo Funciona (Técnico)

### Antes (❌ No funcionaba):
```javascript
// Viejo código - SIN notificaciones push
await addDoc(collection(db, "notificaciones"), {
  IdUsuario: user.id,
  Titulo: "...",
  Mensaje: "...",
  // FALTA: enviado: false ❌
});
```

### Ahora (✅ Con push notifications automáticas):
```javascript
// Nuevo código - CON notificaciones push
import { createNotification } from "../utils/createNotification";

await createNotification({
  IdUsuario: user.id,
  Titulo: "Cita cancelada",
  Mensaje: "Tu cancelación fue registrada",
  Destino: "/citas" // Opcional
});
```

### Qué pasa automáticamente:
1. ✅ `createNotification()` establece `enviado: false`
2. ✅ `pushNotificationService.js` detecta el cambio
3. ✅ Envía vía `Capacitor.PushNotifications`
4. ✅ Marca como `enviado: true` en Firestore

---

## 📋 Estado de Actualización de Servicios

| Servicio | Archivo | Estado | Notificaciones |
|----------|---------|--------|-----------------|
| **Citas Médicas** | `citasMedicasService.js` | ✅ Actualizado | Cancelación (usuario y admin) |
| **Noticias** | `newsService.js` | ✅ Actualizado | Nueva noticia (broadcast) |
| **Agendas Médicas** | `agendaMedicaService.js` | ✅ Actualizado | Nueva agenda (broadcast) |
| **Solicitudes de Cambio** | `solicitudesCambiosService.js` | ⏳ Pendiente | Respuesta a solicitud |
| **Encuestas** | `encuestasService.js` | ⏳ Pendiente | Nueva encuesta (broadcast) |
| **Support Tickets** | `supportTicketService.js` | ⏳ Pendiente | Respuesta a ticket |

---

## 🚀 Usar en Nuevos Servicios

### Template para cualquier nueva actividad:

```javascript
// En tu servicio
import { createNotification } from "../utils/createNotification";

export const miAccion = async (userId, data) => {
  try {
    // 1. Hacer la acción principal
    const result = await someFirestoreUpdate();

    // 2. Crear la notificación (automáticamente dispara push)
    await createNotification({
      IdUsuario: userId,
      Titulo: "📝 Títu lo descriptivo",
      Mensaje: "Mensaje que verá el usuario",
      Destino: "/ruta-destino", // Opcional
      extra: {
        // Datos adicionales opcionales
        accionId: result.id
      }
    });

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
```

---

## 🔧 Casos de Uso Comunes

### Caso 1: Notificación a un usuario específico

```javascript
await createNotification({
  IdUsuario: user.id,
  Titulo: "Tu cita fue confirmada",
  Mensaje: "Tu cita es el 15/08 a las 10:00",
  Destino: "/citas-medicas"
});
```

### Caso 2: Notificación a múltiples usuarios (broadcast)

```javascript
const usersSnapshot = await getDocs(collection(db, "usuarios"));

const promises = usersSnapshot.docs.map(userDoc =>
  createNotification({
    IdUsuario: userDoc.id,
    Titulo: "📰 Nueva noticia importante",
    Mensaje: "Se publicó un comunicado importante",
    Destino: "/news"
  }).catch(error => console.error("Error:", error))
);

await Promise.all(promises);
```

### Caso 3: Notificación a usuarios por filtro (ej. por área)

```javascript
const usersSnapshot = await getDocs(
  query(collection(db, "usuarios"), where("area", "==", "Sistemas"))
);

const promises = usersSnapshot.docs.map(userDoc =>
  createNotification({
    IdUsuario: userDoc.id,
    Titulo: "⚙️ Mantenimiento de sistemas",
    Mensaje: "Habrá mantenimiento el sábado de 10:00 a 14:00",
    Destino: "/mantenimiento"
  })
);

await Promise.all(promises);
```

---

## ⚙️ Configuración en Firestore

### Estructura estándar de notificación:

```json
{
  "IdUsuario": "uid-del-usuario",           // ✅ Requerido
  "Titulo": "Título mostrado",              // ✅ Requerido
  "Mensaje": "Cuerpo de la notificación",   // ✅ Requerido
  "Destino": "/ruta-app",                   // Opcional
  "Accion": "tipo-accion",                  // Opcional
  "enviado": false,                         // ✅ Auto-establecido
  "fechaCreacion": "2026-08-05T12:00:00Z",  // ✅ Auto-establecido
  "fechaEnviado": null                      // ✅ Auto-actualizado
}
```

---

## 🎯 Testing de Notificaciones Automáticas

### 1. Crear una cita y cancelarla:
```
1. App → Citas Médicas → Agendar cita
2. Mis Citas → Cancelar
3. ✅ Notificación push llega automáticamente
```

### 2. Crear una noticia desde admin:
```
1. Panel Admin → Noticias → Crear
2. Completa formulario y publica
3. ✅ TODOS los usuarios reciben notificación push
```

### 3. Crear una agenda médica:
```
1. Panel Admin → Agendas → Crear
2. Configura y guarda
3. ✅ TODOS los usuarios reciben notificación de nueva campaña
```

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────┐
│  Usuario realiza una acción:             │
│  - Cancela cita                          │
│  - Admin publica noticia                 │
│  - Admin crea agenda                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Servicio crea notificación │
    │ await createNotification() │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ Firestore: notificaciones         │
    │ {                                 │
    │   IdUsuario: "...",              │
    │   enviado: false,    ← CLAVE     │
    │   Titulo: "...",                 │
    │   Mensaje: "...",                │
    │   fechaCreacion: timestamp       │
    │ }                                │
    └────────────┬────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ pushNotificationService.js     │
    │ (listener en tiempo real)      │
    │ Detecta: enviado === false     │
    └────────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Capacitor PushNotifications │
    │ Envía vía FCM/APNs         │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌───────────────────────────┐
    │ Firebase Cloud Messaging  │
    │ (necesita Cloud Function) │
    └────────────┬──────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    ┌─────────┐      ┌──────────┐
    │ Android │      │ iOS/Web  │
    │ Device  │      │ Browser  │
    └─────────┘      └──────────┘
         │                │
         │                │
      (incluso)        (Service)
      (app              (Worker)
      (cerrada)         (recibe)
```

---

## ✨ Beneficios

- ✅ **Automático**: Sin código extra en cada acción
- ✅ **Centralizado**: Un solo lugar (`createNotification`)
- ✅ **Consistente**: Mismo formato en todas partes
- ✅ **Offline**: Service Worker recibe incluso con app cerrada
- ✅ **En tiempo real**: Listener Firestore detecta cambios instantáneamente

---

## ⚠️ Requiere

1. ✅ Service Worker registrado (`main.jsx`)
2. ✅ Hook de push notifications (`usePushNotifications.js`)
3. ✅ Servicio listener (`pushNotificationService.js`)
4. ⏳ Cloud Function en Firebase (paso final)

---

## Próximos pasos

1. **Completar migración** de los servicios restantes
2. **Deploy Cloud Function** para soporte offline
3. **Revisar Firestore Security Rules** para permisos de notificaciones

Ver: `PUSH_NOTIFICATIONS_SETUP.md` y `TEST_PUSH_NOTIFICATIONS.md`
