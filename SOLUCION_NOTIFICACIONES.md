# Solución: Desajuste de UIDs en Notificaciones Push

## Problema Identificado
El sistema de notificaciones no funcionaba debido a un desajuste de identificadores (UID) entre la aplicación móvil y la base de datos:

- **UID que usaba la app móvil**: `lH4YgNmKDKfFPcrZosO1MlnTpm43` (viejo, de localStorage)
- **UID real en Firestore**: `ElfT4912DjgjQ...` (correcto, de Firebase Authentication)

**Consecuencias**:
- El contador de notificaciones (campanita) permanecía vacío
- Las notificaciones push nunca se mostraban
- No se emitía sonido en el dispositivo
- Los listeners de Firestore retornaban resultados vacíos

## Causa Raíz
El código estaba realizando fallbacks a `localStorage` para obtener el UID del usuario, y ese localStorage contenía un UID viejo o incorrecto. En lugar de usar siempre el UID verdadero de Firebase Authentication, la aplicación caía a valores obsoletos.

## Cambios Realizados

### 1. **usePushNotifications.js** (línea 27)
```diff
- const uidReal = user?.uid || user?.id || JSON.parse(localStorage.getItem("auth") || "{}")?.uid || ...;
+ const uidReal = user?.uid;
```
**Cambio**: Eliminar completamente la lógica de localStorage. Usar SOLO el UID de Firebase.

### 2. **AuthProvider.jsx** (línea 47)
```diff
  const usuarioCompleto = {
      ...userData,
      username,
+     uid: firebaseUser.uid,
      mustChangePassword: userData.mustChangePassword || false
  };
```
**Cambio**: Incluir el `uid` real de Firebase Authentication en el objeto de usuario que se propaga por la aplicación.

### 3. **AppRouter.jsx** (línea 52 y 60)
```diff
- const userId = user?.uid || user?.id;
+ const userId = user?.uid;
```
```diff
- }, [user?.uid, user?.id]);
+ }, [user?.uid]);
```
**Cambio**: Eliminar el fallback a `user?.id`. Depender solo de `user?.uid`.

### 4. **AppOperator.jsx** (línea 67, 84, 104)
```diff
- Línea 67: [user?.uid, user?.id] → [user?.uid]
- Línea 84: user?.uid || user?.id → user?.uid
- Línea 104: user?.uid || user?.id → user?.uid
```
**Cambio**: Consolidar todos los listeners para usar SOLO el UID de Firebase.

**Además**: Se eliminó un `useEffect` duplicado que tenía un typo (`"noticaciones"` en lugar de `"notificaciones"`).

### 5. **citasMedicasService.js** (línea 103 y 108)
```diff
- canceladaPor: user?.uid || user?.id || null,
+ canceladaPor: user?.uid || null,
```
```diff
- if (user?.id) {
-     await createNotification({ IdUsuario: user.id, ... });
+ if (user?.uid) {
+     await createNotification({ IdUsuario: user.uid, ... });
```
**Cambio**: Usar el UID de Firebase en lugar de un ID secundario.

### 6. **OperadorCitasMedicas.jsx** (línea 161)
```diff
- const uidUsuario = user?.uid || user?.id || nombreFinal;
+ const uidUsuario = user?.uid;
```
**Cambio**: Usar SOLO el UID. El nombre no es un identificador válido en Firestore.

### 7. **AgendaMedicaPage.jsx** (línea 183)
```diff
- const adminUid = user?.uid || user?.id || "Administrador";
+ const adminUid = user?.uid;
```
**Cambio**: Usar SOLO el UID de Firebase Authentication.

## Garantías Post-Solución

✅ **Autenticación correcta**: El `AuthProvider` ahora proporciona siempre el UID real de Firebase.

✅ **Consistencia global**: Todos los listeners de Firestore usan `user?.uid` y dependen de un único `useEffect`.

✅ **Sin fallbacks peligrosos**: Se eliminaron TODAS las referencias a localStorage como fuente de UID.

✅ **Notificaciones sincronizadas**: El query `where("IdUsuario", "==", uid)` ahora coincide con los documentos creados por el administrador.

## Pasos de Validación

1. **Limpiar localStorage del navegador/app**: Eliminar cualquier rastro del UID viejo.
2. **Cerrar y reabrir la aplicación**: Forzar que se autentique con Firebase nuevamente.
3. **Verificar la consola**: Debe mostrar `FCM_GUARDANDO: Escribiendo token en Firestore para el usuario: [UID_CORRECTO]`.
4. **Enviar una notificación de prueba**: El contador debe actualizarse y el sonido debe sonar.

## Archivos Modificados
- `src/hooks/usePushNotifications.js`
- `src/context/AuthProvider.jsx`
- `src/router/AppRouter.jsx`
- `src/pages/operator/AppOperator.jsx`
- `src/pages/operator/OperadorCitasMedicas.jsx`
- `src/services/citasMedicasService.js`
- `src/modules/agendamedica/AgendaMedicaPage.jsx`
