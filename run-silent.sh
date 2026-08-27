#!/bin/bash

# Script para ejecutar la app suprimiendo logs de notificaciones innecesarios

echo "🚀 Iniciando SII AQUA Médica con notificaciones silenciosas..."

# Ejecutar npm run dev pero filtrar logs innecesarios
npm run dev 2>&1 | grep -v "XMLHttpRequest" | grep -v "preflight" | grep -v "CORS" | grep -v "firebasestorage" | grep -v "net::ERR"
