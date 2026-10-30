import { useSyncExternalStore } from 'react'
import { sqlEngine, type EngineState, type SqlEngine } from './sqlEngine.ts'

/** An engine's current status, re-rendering when it changes. Defaults to the practice engine. */
export function useSqlEngine(engine: SqlEngine = sqlEngine): EngineState {
  return useSyncExternalStore(engine.subscribe, engine.getState)
}
