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

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the value is simply not remembered.
  }
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
