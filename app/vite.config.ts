import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { contentPlugin } from './plugins/content/index.ts'

const content = {
  dir: fileURLToPath(new URL('./src/content/modules', import.meta.url)),
  datasetsDir: fileURLToPath(new URL('./src/content/datasets', import.meta.url)),
  challengesDir: fileURLToPath(new URL('./src/content/challenges', import.meta.url)),
  quizzesDir: fileURLToPath(new URL('./src/content/quizzes', import.meta.url)),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Validates the Markdown lessons, challenges and quizzes and makes them available to the app.
    contentPlugin(content),
  ],
  // The SQL worker is an ES module (it imports sql.js, the dataset and the challenge solutions).
  worker: {
    format: 'es',
    plugins: () => [contentPlugin(content)],
  },
})
