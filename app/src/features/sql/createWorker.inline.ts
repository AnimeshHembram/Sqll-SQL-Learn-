/**
 * Offline build only: the worker's code is embedded in the page and started
 * from a blob, so it works when index.html is opened straight from disk.
 */
import SqlWorker from './sql.worker.ts?worker&inline'

export function createSqlWorker(name: string): Worker {
  return new SqlWorker({ name })
}
