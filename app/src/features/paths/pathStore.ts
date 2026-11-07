import { useSyncExternalStore } from 'react'
import { readStored, subscribeStored, writeStored } from '../../lib/storage.ts'
import { emptyPathProgress, parsePathProgress, selectPath, type PathProgressData } from './pathModel.ts'

/**
 * SQL Path progress, saved in this browser under its own versioned key and
 * shared with React through useSyncExternalStore (the same approach as
 * progressStore.ts). Settings → "Reset progress" clears it with everything else.
 */

const KEY = 'paths:v1'

let cache: PathProgressData | null = null
const listeners = new Set<() => void>()

function load(): PathProgressData {
  return parsePathProgress(readStored(KEY)) ?? emptyPathProgress()
}

function notify() {
  listeners.forEach((listener) => listener())
}

/** Re-reads saved path progress, for example after another tab changed it or saved data was cleared. */
export function reloadPathProgress(): void {
  cache = load()
  notify()
}

if (typeof window !== 'undefined') {
  subscribeStored(KEY, reloadPathProgress)
}

export function getPathProgress(): PathProgressData {
  cache ??= load()
  return cache
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function commit(change: (current: PathProgressData) => PathProgressData): boolean {
  cache = change(getPathProgress())
  const saved = writeStored(KEY, cache)
  notify()
  return saved
}

export function usePathProgress(): PathProgressData {
  return useSyncExternalStore(subscribe, getPathProgress, emptyPathProgress)
}

/** Makes a path the current one. Other paths' progress is kept. Returns false if it could not be saved. */
export function choosePath(pathId: string, now = new Date()): boolean {
  return commit((current) => selectPath(current, pathId, now))
}
