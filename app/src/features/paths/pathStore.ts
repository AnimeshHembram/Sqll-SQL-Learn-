import { useSyncExternalStore } from 'react'
import { readStored, removeStored, subscribeStored, writeStored } from '../../lib/storage.ts'
import {
  emptyPathProgress,
  ensurePathRecord,
  parsePathProgress,
  recordChapterComplete,
  recordChapterQuiz,
  recordBadges,
  recordExerciseAttempt,
  recordExerciseHelp,
  recordProblemAttempt,
  recordProblemHelp,
  selectPath,
  updatePathRecord,
  type PathProgressData,
  type PathRecord,
} from './pathModel.ts'
import { reachedMilestones } from './problemSummary.ts'
import { clearDrafts, reloadDrafts } from './pathDrafts.ts'

/**
 * SQL Path progress, saved in this browser under its own versioned key and
 * shared with React through useSyncExternalStore (the same approach as
 * progressStore.ts). It is part of Settings → "Export progress" and "Import
 * progress", and both "Reset progress" and "Delete all saved data" clear it.
 * An empty record is stored as no entry at all, so a learner who never opens
 * SQL Path has nothing saved under this key.
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
  // Saved drafts are re-read too, so "Delete all saved data" also forgets them in this tab.
  reloadDrafts()
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

/**
 * Replaces all SQL Path progress, for example with an imported file. Empty
 * progress removes the saved entry. Returns false if it could not be saved.
 */
export function replacePathProgress(data: PathProgressData): boolean {
  cache = data
  const saved = Object.keys(data.paths).length === 0 ? removeStored(KEY) : writeStored(KEY, data)
  notify()
  return saved
}

/** Clears SQL Path progress and the saved drafts. Returns false if storage is unavailable. */
export function resetPathProgress(): boolean {
  const cleared = replacePathProgress(emptyPathProgress())
  return clearDrafts() && cleared
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

/**
 * Records a daily problem submission and saves any milestone badge it reaches.
 * `problemIds` are the path's written problems, so the solved count is exact.
 */
export function recordPathProblemSubmission(
  pathId: string,
  problemId: string,
  correct: boolean,
  problemIds: readonly string[],
  now = new Date(),
): boolean {
  return commitToPath(
    pathId,
    (record) => {
      const updated = recordProblemAttempt(record, problemId, correct, now)
      const solved = problemIds.filter((id) => updated.problems[id]?.solvedAt).length
      return recordBadges(updated, reachedMilestones(solved).map((milestone) => milestone.id), now)
    },
    now,
  )
}

export function recordPathProblemHints(pathId: string, problemId: string, hintsUsed: number, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordProblemHelp(record, problemId, { hintsUsed }), now)
}

export function recordPathProblemSolutionRevealed(pathId: string, problemId: string, now = new Date()): boolean {
  return commitToPath(pathId, (record) => recordProblemHelp(record, problemId, { revealedSolution: true }), now)
}
