import { useSyncExternalStore } from 'react'

/**
 * What the learner has done on each challenge during this visit: the query in
 * the editor, hints shown, submissions and whether the solution was revealed.
 *
 * Kept in memory only. It survives moving between pages, but not a reload or a
 * new tab, and nothing is saved to the browser's storage. Long-term progress is
 * not part of this version of the app.
 */
export interface ChallengeSession {
  /** The editor's content, or null for the starter query. */
  draft: string | null
  hintsShown: number
  submissions: number
  solved: boolean
  revealed: boolean
}

const EMPTY: ChallengeSession = { draft: null, hintsShown: 0, submissions: 0, solved: false, revealed: false }

const sessions = new Map<string, ChallengeSession>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getChallengeSession(challengeId: string): ChallengeSession {
  return sessions.get(challengeId) ?? EMPTY
}

export function updateChallengeSession(challengeId: string, update: (session: ChallengeSession) => Partial<ChallengeSession>) {
  const current = getChallengeSession(challengeId)
  sessions.set(challengeId, { ...current, ...update(current) })
  listeners.forEach((listener) => listener())
}

export function useChallengeSession(challengeId: string): ChallengeSession {
  return useSyncExternalStore(subscribe, () => getChallengeSession(challengeId))
}
