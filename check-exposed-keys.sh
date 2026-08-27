#!/bin/bash

# Script para buscar y reportar keys de Firebase expuestas

echo "🔍 Buscando keys de Firebase expuestas en consola..."

# Buscar patterns de API keys
echo ""
echo "=== API Keys (AIza...) ==="
grep -r "AIzaSy" src --include="*.js" --include="*.jsx" | grep -v maskFirebaseKeys | grep -v node_modules

# Buscar patterns de JWT tokens
echo ""
echo "=== JWT Tokens (eyJ...) ==="
grep -r "eyJ" src --include="*.js" --include="*.jsx" | grep -v maskFirebaseKeys | grep -v node_modules

# Buscar credenciales en consola.log
echo ""
echo "=== Credenciales en console.log ==="
grep -r "console\.\(log\|error\)" src --include="*.js" --include="*.jsx" | grep -i "key\|token\|secret\|password" | grep -v maskFirebaseKeys

# Buscar URLs con auth
echo ""
echo "=== URLs con parámetros auth ==="
grep -r "auth=" src --include="*.js" --include="*.jsx" | grep -v maskFirebaseKeys | head -10

echo ""
echo "✅ Búsqueda completada"
echo "💡 Usa maskFirebaseKeys.js para enmascarar automáticamente en consola"
