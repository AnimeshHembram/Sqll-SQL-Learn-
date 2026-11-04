/**
 * Starts the database worker as a separate file next to the page.
 *
 * The offline build (`npm run build:offline`) swaps this module for
 * createWorker.inline.ts, because a page opened from disk cannot load a worker file.
 */
export function createSqlWorker(name: string): Worker {
  return new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module', name })
}
