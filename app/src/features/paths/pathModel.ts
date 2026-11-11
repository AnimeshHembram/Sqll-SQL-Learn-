/**
 * Saved SQL Path progress: its shape, how stored data is checked, and pure
 * updates. Nothing here touches the browser (pathStore.ts does), so it runs in
 * Node for npm run test:paths.
 *
 * Every career path has its own record. Choosing or switching paths only
 * changes `activePathId` and, the first time a path is chosen, adds an empty
 * record for it. No update ever replaces or clears another path's record.
 *
 * The record already holds chapters, chapter quizzes, daily problems, projects
 * and badges, so later stages add tracking without changing the saved format.
 * This data is separate from the Learn SQL progress (progress:v1).
 */

export const PATH_PROGRESS_VERSION = 1

export interface PathChapterProgress {
  completedAt: string
}

export interface PathQuizProgress {
  bestScore: number
  lastScore: number
  total: number
  attempts: number
  lastTakenAt: string
}

/** A chapter exercise. Checked like a challenge, but saved in its path's own record. */
export interface PathExerciseProgress {
  /** ISO timestamp of the first correct submission, or null while unsolved. */
  solvedAt: string | null
  attempts: number
  /** The most hints shown in any visit. */
  hintsUsed: number
  revealedSolution: boolean
}

export interface PathProblemProgress {
  /** ISO timestamp of the first correct answer, or null while unsolved. */
  solvedAt: string | null
  attempts: number
  /** The most hints shown in any visit. */
  hintsUsed: number
  revealedSolution: boolean
}

export interface PathProjectProgress {
  startedAt: string
  completedAt: string | null
}

export interface PathBadgeProgress {
  earnedAt: string
}

/** Everything saved for one career path. */
export interface PathRecord {
  /** When the learner first chose this path. */
  startedAt: string
  /** When the learner last made this their current path. */
  lastSelectedAt: string
  /** Keyed by chapter id. */
  chapters: Record<string, PathChapterProgress>
  /** Keyed by exercise id. */
  exercises: Record<string, PathExerciseProgress>
  /** Keyed by chapter id: each chapter has one quiz. */
  quizzes: Record<string, PathQuizProgress>
  /** Keyed by problem id. */
  problems: Record<string, PathProblemProgress>
  /** Keyed by project id. */
  projects: Record<string, PathProjectProgress>
  /** Keyed by badge id. */
  badges: Record<string, PathBadgeProgress>
}

export interface PathProgressData {
  version: typeof PATH_PROGRESS_VERSION
  /** The path the learner is currently following, or null before choosing one. */
  activePathId: string | null
  /** Keyed by path id. A path has a record once it has been chosen at least once. */
  paths: Record<string, PathRecord>
}

export function emptyPathProgress(): PathProgressData {
  return { version: PATH_PROGRESS_VERSION, activePathId: null, paths: {} }
}

export function emptyPathRecord(now: Date): PathRecord {
  const at = now.toISOString()
  return { startedAt: at, lastSelectedAt: at, chapters: {}, exercises: {}, quizzes: {}, problems: {}, projects: {}, badges: {} }
}

// --- Updates -----------------------------------------------------------------------

/**
 * Makes `pathId` the current path. Its existing record is kept (only
 * lastSelectedAt changes); a path chosen for the first time gets an empty record.
 * Every other path's record is left exactly as it was.
 */
export function selectPath(data: PathProgressData, pathId: string, now: Date): PathProgressData {
  if (!isId(pathId)) return data
  const existing = data.paths[pathId]
  const record = existing ? { ...existing, lastSelectedAt: now.toISOString() } : emptyPathRecord(now)
  return { ...data, activePathId: pathId, paths: { ...data.paths, [pathId]: record } }
}

/** Applies a change to one path's record only. Does nothing for a path that has no record yet. */
export function updatePathRecord(
  data: PathProgressData,
  pathId: string,
  change: (record: PathRecord) => PathRecord,
): PathProgressData {
  const record = data.paths[pathId]
  if (!record) return data
  return { ...data, paths: { ...data.paths, [pathId]: change(record) } }
}

/** Creates the path's record if it has none, without changing the current path. */
export function ensurePathRecord(data: PathProgressData, pathId: string, now: Date): PathProgressData {
  if (!isId(pathId) || data.paths[pathId]) return data
  return { ...data, paths: { ...data.paths, [pathId]: emptyPathRecord(now) } }
}

export function recordExerciseAttempt(record: PathRecord, exerciseId: string, correct: boolean, now: Date): PathRecord {
  const current = record.exercises[exerciseId] ?? { solvedAt: null, attempts: 0, hintsUsed: 0, revealedSolution: false }
  const next: PathExerciseProgress = {
    ...current,
    attempts: current.attempts + 1,
    solvedAt: current.solvedAt ?? (correct ? now.toISOString() : null),
  }
  return { ...record, exercises: { ...record.exercises, [exerciseId]: next } }
}

/**
 * Notes that the learner is working on a project: the first attempt, hint or revealed solution
 * sets startedAt. Nothing changes once the project has an entry.
 */
export function recordProjectStarted(record: PathRecord, projectId: string, now: Date): PathRecord {
  if (record.projects[projectId]) return record
  return { ...record, projects: { ...record.projects, [projectId]: { startedAt: now.toISOString(), completedAt: null } } }
}

/**
 * Marks a project complete once every one of its tasks is solved (task progress is kept in
 * `exercises`, keyed by task id). The first completion date is kept; a project never becomes
 * incomplete again.
 */
export function recordProjectCompletion(record: PathRecord, projectId: string, taskIds: readonly string[], now: Date): PathRecord {
  const current = record.projects[projectId]
  if (current?.completedAt || taskIds.length === 0 || !taskIds.every((id) => record.exercises[id]?.solvedAt)) return record
  const at = now.toISOString()
  return { ...record, projects: { ...record.projects, [projectId]: { startedAt: current?.startedAt ?? at, completedAt: at } } }
}

export function recordExerciseHelp(record: PathRecord, exerciseId: string, help: { hintsUsed?: number; revealedSolution?: boolean }): PathRecord {
  const current = record.exercises[exerciseId] ?? { solvedAt: null, attempts: 0, hintsUsed: 0, revealedSolution: false }
  const next: PathExerciseProgress = {
    ...current,
    hintsUsed: Math.max(current.hintsUsed, help.hintsUsed ?? 0),
    revealedSolution: current.revealedSolution || Boolean(help.revealedSolution),
  }
  return { ...record, exercises: { ...record.exercises, [exerciseId]: next } }
}

export function recordChapterQuiz(record: PathRecord, chapterId: string, score: number, total: number, now: Date): PathRecord {
  const current = record.quizzes[chapterId]
  const next: PathQuizProgress = {
    bestScore: Math.max(current?.bestScore ?? 0, score),
    lastScore: score,
    total,
    attempts: (current?.attempts ?? 0) + 1,
    lastTakenAt: now.toISOString(),
  }
  return { ...record, quizzes: { ...record.quizzes, [chapterId]: next } }
}

const NO_PROBLEM_PROGRESS: PathProblemProgress = { solvedAt: null, attempts: 0, hintsUsed: 0, revealedSolution: false }

/** Records a daily problem submission. The first solve date is kept; nothing is ever taken away. */
export function recordProblemAttempt(record: PathRecord, problemId: string, correct: boolean, now: Date): PathRecord {
  const current = record.problems[problemId] ?? NO_PROBLEM_PROGRESS
  const next: PathProblemProgress = { ...current, attempts: current.attempts + 1, solvedAt: current.solvedAt ?? (correct ? now.toISOString() : null) }
  return { ...record, problems: { ...record.problems, [problemId]: next } }
}

export function recordProblemHelp(record: PathRecord, problemId: string, help: { hintsUsed?: number; revealedSolution?: boolean }): PathRecord {
  const current = record.problems[problemId] ?? NO_PROBLEM_PROGRESS
  const next: PathProblemProgress = {
    ...current,
    hintsUsed: Math.max(current.hintsUsed, help.hintsUsed ?? 0),
    revealedSolution: current.revealedSolution || Boolean(help.revealedSolution),
  }
  return { ...record, problems: { ...record.problems, [problemId]: next } }
}

/** Adds badges that are not in the record yet. Earned badges are never removed or re-dated. */
export function recordBadges(record: PathRecord, badgeIds: readonly string[], now: Date): PathRecord {
  const missing = badgeIds.filter((id) => isId(id) && !record.badges[id])
  if (missing.length === 0) return record
  const badges = { ...record.badges }
  for (const id of missing) badges[id] = { earnedAt: now.toISOString() }
  return { ...record, badges }
}

/** Marks a chapter complete. The first completion date is kept. */
export function recordChapterComplete(record: PathRecord, chapterId: string, now: Date): PathRecord {
  if (record.chapters[chapterId]) return record
  return { ...record, chapters: { ...record.chapters, [chapterId]: { completedAt: now.toISOString() } } }
}

// --- Checking stored data ------------------------------------------------------------

/*
 * Stored data comes from the learner's browser, so it is never trusted. Each
 * entry is checked on its own: a damaged entry is dropped and the rest is kept.
 */

type Plain = Record<string, unknown>

function isPlain(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : null
}

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Path, chapter, problem, project and badge ids are short slugs. */
export function isId(value: string): boolean {
  return value.length > 0 && value.length <= 120 && /^[\w-]+$/.test(value) && !RESERVED_KEYS.has(value)
}

/** Reads a keyed collection, keeping only entries with a valid id and a valid value. */
function readMap<T>(value: unknown, read: (entry: unknown) => T | null): Record<string, T> {
  const result: Record<string, T> = {}
  if (!isPlain(value)) return result
  for (const [key, entry] of Object.entries(value)) {
    if (!isId(key)) continue
    const parsed = read(entry)
    if (parsed !== null) result[key] = parsed
  }
  return result
}

function readChapter(value: unknown): PathChapterProgress | null {
  return isPlain(value) && isTimestamp(value.completedAt) ? { completedAt: value.completedAt } : null
}

function readExercise(value: unknown): PathExerciseProgress | null {
  if (!isPlain(value)) return null
  const attempts = count(value.attempts)
  const hintsUsed = count(value.hintsUsed)
  const solvedAt = value.solvedAt === null ? null : isTimestamp(value.solvedAt) ? value.solvedAt : undefined
  if (attempts === null || hintsUsed === null || solvedAt === undefined || typeof value.revealedSolution !== 'boolean') return null
  return { solvedAt, attempts, hintsUsed, revealedSolution: value.revealedSolution }
}

function readQuiz(value: unknown): PathQuizProgress | null {
  if (!isPlain(value)) return null
  const bestScore = count(value.bestScore)
  const lastScore = count(value.lastScore)
  const total = count(value.total)
  const attempts = count(value.attempts)
  if (bestScore === null || lastScore === null || total === null || attempts === null) return null
  if (bestScore > total || lastScore > total || !isTimestamp(value.lastTakenAt)) return null
  return { bestScore, lastScore, total, attempts, lastTakenAt: value.lastTakenAt }
}

function readProblem(value: unknown): PathProblemProgress | null {
  if (!isPlain(value)) return null
  const attempts = count(value.attempts)
  const solvedAt = value.solvedAt === null ? null : isTimestamp(value.solvedAt) ? value.solvedAt : undefined
  if (attempts === null || solvedAt === undefined) return null
  // hintsUsed and revealedSolution were added in Stage 3; older entries read as none used.
  return { solvedAt, attempts, hintsUsed: count(value.hintsUsed) ?? 0, revealedSolution: value.revealedSolution === true }
}

function readProject(value: unknown): PathProjectProgress | null {
  if (!isPlain(value) || !isTimestamp(value.startedAt)) return null
  const completedAt = value.completedAt === null ? null : isTimestamp(value.completedAt) ? value.completedAt : undefined
  if (completedAt === undefined) return null
  return { startedAt: value.startedAt, completedAt }
}

function readBadge(value: unknown): PathBadgeProgress | null {
  return isPlain(value) && isTimestamp(value.earnedAt) ? { earnedAt: value.earnedAt } : null
}

function readRecord(value: unknown): PathRecord | null {
  if (!isPlain(value) || !isTimestamp(value.startedAt)) return null
  return {
    startedAt: value.startedAt,
    lastSelectedAt: isTimestamp(value.lastSelectedAt) ? value.lastSelectedAt : value.startedAt,
    chapters: readMap(value.chapters, readChapter),
    // Missing in data saved before exercises existed: read as none, so nothing is lost.
    exercises: readMap(value.exercises, readExercise),
    quizzes: readMap(value.quizzes, readQuiz),
    problems: readMap(value.problems, readProblem),
    projects: readMap(value.projects, readProject),
    badges: readMap(value.badges, readBadge),
  }
}

/**
 * Checks stored path progress. Returns null for anything that is not path
 * progress of this version. Records of path ids the app does not know are
 * kept, so data saved by a newer version is not thrown away.
 */
export function parsePathProgress(value: unknown): PathProgressData | null {
  if (!isPlain(value) || value.version !== PATH_PROGRESS_VERSION) return null
  const paths = readMap(value.paths, readRecord)
  const active = typeof value.activePathId === 'string' && isId(value.activePathId) && paths[value.activePathId] ? value.activePathId : null
  return { version: PATH_PROGRESS_VERSION, activePathId: active, paths }
}
