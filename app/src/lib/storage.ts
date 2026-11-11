/**
 * Safe wrappers around localStorage.
 * Storage can be blocked or throw (private windows, strict privacy settings),
 * so every call is guarded and the app keeps working without it.
 */

const PREFIX = 'sql-learner:'

export function readStored(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

/** Saves a value. Returns false if it could not be saved (storage blocked or full). */
export function writeStored(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    // Storage unavailable: the value is simply not remembered.
    return false
  }
}

/** Removes one saved value. Returns false if storage is unavailable. */
export function removeStored(key: string): boolean {
  try {
    window.localStorage.removeItem(PREFIX + key)
    return true
  } catch {
    return false
  }
}

/** True when this browser lets SQL Learner save data. */
export function isStorageAvailable(): boolean {
  try {
    const probe = `${PREFIX}probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * Calls `listener` when another tab changes or clears the stored value.
 * (The browser does not send this event to the tab that made the change.)
 */
export function subscribeStored(key: string, listener: () => void): () => void {
  const handle = (event: StorageEvent) => {
    if (event.key === null || event.key === PREFIX + key) listener()
  }
  window.addEventListener('storage', handle)
  return () => window.removeEventListener('storage', handle)
}

/** Removes everything SQL Learner has saved in this browser. Returns false if storage is unavailable. */
export function clearAllStored(): boolean {
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key)
    }
    keys.forEach((key) => window.localStorage.removeItem(key))
    return true
  } catch {
    return false
  }
}
