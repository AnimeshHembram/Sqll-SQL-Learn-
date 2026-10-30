import { useSyncExternalStore } from 'react'
import { sqlEngine, type EngineState } from './sqlEngine.ts'

/** The engine's current status, re-rendering when it changes. */
export function useSqlEngine(): EngineState {
  return useSyncExternalStore(sqlEngine.subscribe, sqlEngine.getState)
}
