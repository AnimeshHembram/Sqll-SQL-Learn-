import { useSyncExternalStore } from 'react'
import { readStored, subscribeStored, writeStored } from '../../lib/storage.ts'
import {
  emptyPathProgress,
  ensurePathRecord,
  parsePathProgress,
  recordChapterComplete,
  recordChapterQuiz,
  recordExerciseAttempt,
  recordExerciseHelp,
  selectPath,
  updatePathRecord,
  type PathProgressData,
  type PathRecord,
} from './pathModel.ts'

/**
 * SQL Path progress, saved in this browser under its own versioned key and
 * shared with React through useSyncExternalStore (the same approach as
 * progressStore.ts). Settings → "Delete all data" clears it; "Reset progress" (Learn SQL) does not.
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

/**
 * Changes one path's record. A path the learner has not chosen yet gets a record
 * first; the current path does not change. No other path's record is touched.
 */
function commitToPath(pathId: string, change: (record: PathRecord) => PathRecord, now: Date): boolean {
  return commit((current) => updatePathRecord(ensurePathRecord(current, pathId, now), pathId, change))
}

export function recordPathExerciseSubmission(pathId: string, exerciseId: string, correct: boolean, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordExerciseAttempt(record, exerciseId, correct, now), now)
}

export function recordPathExerciseHints(pathId: string, exerciseId: string, hintsUsed: number, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordExerciseHelp(record, exerciseId, { hintsUsed }), now)
}

export function recordPathExerciseSolutionRevealed(pathId: string, exerciseId: string, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordExerciseHelp(record, exerciseId, { revealedSolution: true }), now)
}

export function recordPathChapterQuiz(pathId: string, chapterId: string, score: number, total: number, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordChapterQuiz(record, chapterId, score, total, now), now)
}

export function completePathChapter(pathId: string, chapterId: string, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordChapterComplete(record, chapterId, now), now)
}
