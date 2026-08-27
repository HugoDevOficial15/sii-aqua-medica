#!/bin/bash

# Script para suprimir logs de notificaciones en archivos específicos

echo "🔇 Suprimiendo logs de notificaciones..."

# Suprimir console.log en usePushNotifications.js
sed -i '/console\.log.*Notificaci/d' src/hooks/usePushNotifications.js
sed -i '/console\.log.*notificaci/d' src/hooks/usePushNotifications.js

# Suprimir console.error en Header.jsx relacionados a notificaciones
sed -i '/console\.error.*notificaciones/d' src/components/Header.jsx

# Suprimir console.error en OperatorNotifications.jsx
sed -i '/console\.error.*notificaciones/d' src/pages/operator/OperatorNotifications.jsx

echo "✅ Logs de notificaciones suprimidos"
echo "Para revertir, ejecuta: git checkout src/hooks/usePushNotifications.js src/components/Header.jsx src/pages/operator/OperatorNotifications.jsx"
