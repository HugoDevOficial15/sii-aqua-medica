@echo off
REM Script para ejecutar la app suprimiendo logs de notificaciones innecesarios (Windows)

echo 🚀 Iniciando SII AQUA Médica con notificaciones silenciosas...

REM Ejecutar npm run dev pero filtrar logs innecesarios
npm run dev 2>&1 | findstr /v "XMLHttpRequest" | findstr /v "preflight" | findstr /v "CORS" | findstr /v "firebasestorage" | findstr /v "net::ERR"
