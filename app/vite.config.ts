import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { contentPlugin } from './plugins/content/index.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Validates the Markdown lessons and makes them available to the app.
    contentPlugin({
      dir: fileURLToPath(new URL('./src/content/modules', import.meta.url)),
      datasetsDir: fileURLToPath(new URL('./src/content/datasets', import.meta.url)),
    }),
  ],
  // The SQL worker is an ES module (it imports sql.js and the dataset).
  worker: {
    format: 'es',
  },
})
