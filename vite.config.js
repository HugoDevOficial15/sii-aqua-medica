import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Lee el minSdkVersion real desde Gradle para mostrarlo en "Acerca de"
// sin duplicar el valor manualmente en el código de la app.
const variablesGradlePath = fileURLToPath(new URL('./android/variables.gradle', import.meta.url))
const variablesGradle = readFileSync(variablesGradlePath, 'utf-8')
const minSdkMatch = variablesGradle.match(/minSdkVersion\s*=\s*(\d+)/)
const minSdkVersion = minSdkMatch ? minSdkMatch[1] : null

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __MIN_SDK_VERSION__: JSON.stringify(minSdkVersion),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})
