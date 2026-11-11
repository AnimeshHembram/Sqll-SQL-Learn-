import { useSyncExternalStore } from 'react'
import { readStored, subscribeStored, writeStored } from '../../lib/storage.ts'
import {
  addActivity,
  addRecent,
  emptyChallengeProgress,
  emptyProgress,
  lessonKey,
  parseProgress,
  type ChallengeProgress,
  type ProgressData,
} from './progressModel.ts'

/**
 * The learner's progress, saved in this browser's localStorage under one
 * versioned key and shared with React through useSyncExternalStore.
 *
 * - Read once, checked by parseProgress, then kept in memory.
 * - Every change is saved immediately. If storage is blocked the progress
 *   still works for the current visit and is lost on reload.
 * - Other tabs are followed through the browser's storage event, so finishing
 *   a lesson in one tab updates the dashboard open in another.
 */

const KEY = 'progress:v1'

let cache: ProgressData | null = null
const listeners = new Set<() => void>()

function load(): ProgressData {
  return parseProgress(readStored(KEY)) ?? emptyProgress()
}

function notify() {
  listeners.forEach((listener) => listener())
}

/** Re-reads saved progress, for example after another tab changed it or after saved data was cleared. */
export function reloadProgress(): void {
  cache = load()
  notify()
}

if (typeof window !== 'undefined') {
  subscribeStored(KEY, reloadProgress)
}

export function getProgress(): ProgressData {
  cache ??= load()
  return cache
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Applies a change, saves it and tells subscribers. Returns false if it could not be saved. */
function commit(change: (current: ProgressData) => ProgressData): boolean {
  cache = change(getProgress())
  const saved = writeStored(KEY, cache)
  notify()
  return saved
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribe, getProgress, emptyProgress)
}

// --- Lessons ----------------------------------------------------------------------

export function markLessonComplete(moduleId: string, lessonId: string, now = new Date()): void {
  const key = lessonKey(moduleId, lessonId)
  if (getProgress().lessons[key]) return
  commit((current) =>
    addRecent(
      addActivity({ ...current, lessons: { ...current.lessons, [key]: { completedAt: now.toISOString() } } }, now),
      { kind: 'lesson', id: key, at: now.toISOString() },
    ),
  )
}

/** Undoes "Mark as complete". Activity already counted for the day stays, as it really happened. */
export function markLessonIncomplete(moduleId: string, lessonId: string): void {
  const key = lessonKey(moduleId, lessonId)
  if (!getProgress().lessons[key]) return
  commit((current) => {
    const lessons = { ...current.lessons }
    delete lessons[key]
    return {
      ...current,
      lessons,
      recent: current.recent.filter((event) => !(event.kind === 'lesson' && event.id === key)),
    }
  })
}

// --- Challenges -------------------------------------------------------------------

function updateChallenge(
  current: ProgressData,
  challengeId: string,
  update: (challenge: ChallengeProgress) => Partial<ChallengeProgress>,
): ProgressData {
  const challenge = current.challenges[challengeId] ?? emptyChallengeProgress()
  return { ...current, challenges: { ...current.challenges, [challengeId]: { ...challenge, ...update(challenge) } } }
}

export function recordChallengeSubmission(challengeId: string, correct: boolean, now = new Date()): void {
  const firstSolve = correct && !getProgress().challenges[challengeId]?.solvedAt
  commit((current) => {
    let next = updateChallenge(current, challengeId, (challenge) => ({
      attempts: challenge.attempts + 1,
      solvedAt: challenge.solvedAt ?? (correct ? now.toISOString() : null),
    }))
    next = addActivity(next, now)
    return firstSolve ? addRecent(next, { kind: 'challenge', id: challengeId, at: now.toISOString() }) : next
  })
}

export function recordHintsUsed(challengeId: string, hintsShown: number): void {
  if ((getProgress().challenges[challengeId]?.hintsUsed ?? 0) >= hintsShown) return
  commit((current) => updateChallenge(current, challengeId, () => ({ hintsUsed: hintsShown })))
}

export function recordSolutionRevealed(challengeId: string): void {
  const challenge = getProgress().challenges[challengeId]
  if (challenge?.revealedSolution) return
  commit((current) =>
    updateChallenge(current, challengeId, (existing) => ({
      revealedSolution: true,
      revealedBeforeSolving: existing.solvedAt === null,
    })),
  )
}

// --- Quizzes ----------------------------------------------------------------------

export function recordQuizResult(quizId: string, score: number, total: number, now = new Date()): void {
  commit((current) => {
    const previous = current.quizzes[quizId]
    const quizzes = {
      ...current.quizzes,
      [quizId]: {
        bestScore: Math.max(score, previous?.bestScore ?? 0),
        lastScore: score,
        total,
        attempts: (previous?.attempts ?? 0) + 1,
        lastTakenAt: now.toISOString(),
      },
    }
    return addRecent(addActivity({ ...current, quizzes }, now), {
      kind: 'quiz',
      id: quizId,
      at: now.toISOString(),
      detail: `${score}/${total}`,
    })
  })
}

// --- Practice ---------------------------------------------------------------------

/** A query run in the practice space counts towards the day's activity. */
export function recordPracticeRun(now = new Date()): void {
  commit((current) => addActivity(current, now))
}

// --- Whole progress ---------------------------------------------------------------

// The export file (Learn SQL and SQL Path progress together) is built and read in progressFile.ts.

/** Replaces all progress, for example with an imported file. Returns false if it could not be saved. */
export function replaceProgress(progress: ProgressData): boolean {
  return commit(() => progress)
}

export function resetProgress(): boolean {
  return commit(() => emptyProgress())
}
