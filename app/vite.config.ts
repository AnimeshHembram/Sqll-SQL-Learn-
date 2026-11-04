import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { contentPlugin } from './plugins/content/index.ts'
import { inlineIntoHtml, stripFilePreview } from './plugins/offline.ts'

const content = {
  dir: fileURLToPath(new URL('./src/content/modules', import.meta.url)),
  datasetsDir: fileURLToPath(new URL('./src/content/datasets', import.meta.url)),
  challengesDir: fileURLToPath(new URL('./src/content/challenges', import.meta.url)),
  quizzesDir: fileURLToPath(new URL('./src/content/quizzes', import.meta.url)),
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run build:offline`: one dist-offline/index.html that works when opened
  // straight from disk, with no server (see plugins/offline.ts).
  const offline = mode === 'offline'
  // No separate chunks: a page opened from disk cannot load them.
  const singleFile = offline ? { output: { codeSplitting: false } } : undefined

  return {
    // Relative paths, so files next to index.html (the icon) are found from any folder.
    base: offline ? './' : '/',
    plugins: [
      react(),
      // Validates the Markdown lessons, challenges and quizzes and makes them available to the app.
      contentPlugin(content),
      stripFilePreview(),
      ...(offline ? [inlineIntoHtml()] : []),
    ],
    resolve: {
      // The offline build embeds the database worker in the page instead of loading it as a file.
      alias: offline ? [{ find: /^\.\/createWorker\.ts$/, replacement: './createWorker.inline.ts' }] : [],
    },
    // The SQL worker is an ES module (it imports sql.js, the dataset and the challenge solutions).
    worker: {
      // The offline build starts it from a blob, where browsers only allow classic (non-module) workers.
      format: offline ? 'iife' : 'es',
      plugins: () => [contentPlugin(content)],
      rolldownOptions: singleFile,
    },
    build: offline
      ? {
          outDir: 'dist-offline',
          // Every asset (including the SQLite WebAssembly file) becomes a data: URL inside the page.
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          cssCodeSplit: false,
          // Nothing to preload: there are no separate chunks.
          modulePreload: false,
          chunkSizeWarningLimit: 4096,
          rolldownOptions: singleFile,
        }
      : {},
  }
})
