import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const variablesGradlePath = fileURLToPath(new URL('./android/variables.gradle', import.meta.url))
const variablesGradle = readFileSync(variablesGradlePath, 'utf-8')
const minSdkMatch = variablesGradle.match(/minSdkVersion\s*=\s*(\d+)/)
const minSdkVersion = minSdkMatch ? minSdkMatch[1] : null

export default defineConfig({
  plugins: [react()],
  define: {
    __MIN_SDK_VERSION__: JSON.stringify(minSdkVersion),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: { 
    target: 'es2020',
    cssCodeSplit: true,
    modulePreload: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/firebase/') || normalizedId.includes('@firebase') || normalizedId.includes('firebase')) return 'firebase-vendor';
          if (normalizedId.includes('xlsx')) return 'xlsx-vendor';
          if (normalizedId.includes('jspdf') || normalizedId.includes('html2canvas') || normalizedId.includes('jspdf-autotable')) return 'pdf-vendor';
          if (normalizedId.includes('recharts') || normalizedId.includes('d3-') || normalizedId.includes('/chart.js') || normalizedId.includes('react-chartjs-2')) return 'charts-vendor';
          if (normalizedId.includes('react-router-dom')) return 'router-vendor';
          if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) return 'react-vendor';
          if (normalizedId.includes('framer-motion')) return 'motion-vendor';
          if (normalizedId.includes('sweetalert2')) return 'alerts-vendor';
          if (normalizedId.includes('react-icons')) return 'icons-vendor';
          if (normalizedId.includes('bootstrap')) return 'bootstrap-vendor';
          if (normalizedId.includes('date-fns') || normalizedId.includes('dayjs') || normalizedId.includes('moment')) return 'date-vendor';
          if (normalizedId.includes('lodash') || normalizedId.includes('clsx') || normalizedId.includes('nanoid') || normalizedId.includes('uuid')) return 'utility-vendor';

          const packageMatch = normalizedId.match(/node_modules\/(?:@[^/]+\/)?([^/]+)/);
          const packageName = packageMatch?.[1];
          if (packageName) {
            return `vendor-${packageName}`;
          }

          return 'vendor-commons';
        },
      },
    },
  },
})