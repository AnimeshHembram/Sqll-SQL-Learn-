/**
 * The learner's saved progress: its shape, how stored data is checked, and
 * the pure calculations (streaks, recent activity) built on it.
 *
 * Nothing here touches the browser, so it runs unchanged in Node for
 * `npm run test:progress`. Reading and writing localStorage, and telling React
 * about changes, is done by progressStore.ts.
 */

export const PROGRESS_VERSION = 1

/** How many recent events are kept for the dashboard. */
export const RECENT_LIMIT = 20

/** How many days of activity are kept. Older days are dropped when progress is saved. */
export const ACTIVITY_DAYS_KEPT = 400

export interface LessonProgress {
  /** ISO timestamp of when the lesson was marked complete. */
  completedAt: string
}

export interface ChallengeProgress {
  /** ISO timestamp of the first correct submission, or null while unsolved. */
  solvedAt: string | null
  /** Every submission, correct or not. */
  attempts: number
  /** The most hints shown in any visit. */
  hintsUsed: number
  /** True once the reference solution has been shown. */
  revealedSolution: boolean
  /** True when the solution was shown before the first correct submission. */
  revealedBeforeSolving: boolean
}

export interface QuizProgress {
  bestScore: number
  lastScore: number
  /** Number of questions when the quiz was last finished. */
  total: number
  /** How many times the quiz was finished. */
  attempts: number
  lastTakenAt: string
}

export type ActivityKind = 'lesson' | 'challenge' | 'quiz'

/** Something worth listing under "Recent activity". */
export interface RecentEvent {
  kind: ActivityKind
  /** Lesson key ("module/lesson"), challenge id or quiz id. */
  id: string
  at: string
  /** For quizzes, the score as "4/5". */
  detail?: string
}

export interface ProgressData {
  version: typeof PROGRESS_VERSION
  /** Keyed by lessonKey(moduleId, lessonId). */
  lessons: Record<string, LessonProgress>
  challenges: Record<string, ChallengeProgress>
  quizzes: Record<string, QuizProgress>
  /** Local calendar day ("2026-11-04") to the number of learning actions that day. */
  activity: Record<string, number>
  /** Newest first. */
  recent: RecentEvent[]
}

export function emptyProgress(): ProgressData {
  return { version: PROGRESS_VERSION, lessons: {}, challenges: {}, quizzes: {}, activity: {}, recent: [] }
}

export function emptyChallengeProgress(): ChallengeProgress {
  return { solvedAt: null, attempts: 0, hintsUsed: 0, revealedSolution: false, revealedBeforeSolving: false }
}

export function lessonKey(moduleId: string, lessonId: string): string {
  return `${moduleId}/${lessonId}`
}

// --- Dates --------------------------------------------------------------------

/** The local calendar day of a date, as "YYYY-MM-DD". Streaks follow the learner's own days, not UTC. */
export function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** The day `offset` days after (or before, if negative) the given day key. */
export function shiftDay(key: string, offset: number): string {
  const [year, month, day] = key.split('-').map(Number)
  // Noon avoids landing on the wrong day when clocks change.
  return dayKey(new Date(year, month - 1, day + offset, 12))
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

// --- Checking stored data -----------------------------------------------------

/*
 * Stored progress comes from the learner's browser or from an imported file,
 * so it is never trusted. Each entry is checked on its own: a damaged entry is
 * dropped and the rest is kept, rather than losing everything.
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

/** Names that would reach an object's prototype if used as keys. */
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Ids are short slugs; a lesson key is two slugs joined by "/". */
function isId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 200 &&
    /^[\w-]+(\/[\w-]+)?$/.test(value) &&
    !value.split('/').some((part) => RESERVED_KEYS.has(part))
  )
}

function entries(value: unknown): [string, unknown][] {
  return isPlain(value) ? Object.entries(value).filter(([key]) => isId(key)) : []
}

function readLesson(value: unknown): LessonProgress | null {
  return isPlain(value) && isTimestamp(value.completedAt) ? { completedAt: value.completedAt } : null
}

function readChallenge(value: unknown): ChallengeProgress | null {
  if (!isPlain(value)) return null
  const attempts = count(value.attempts)
  const hintsUsed = count(value.hintsUsed)
  const solvedAt = value.solvedAt === null ? null : isTimestamp(value.solvedAt) ? value.solvedAt : undefined
  if (attempts === null || hintsUsed === null || solvedAt === undefined) return null
  if (typeof value.revealedSolution !== 'boolean' || typeof value.revealedBeforeSolving !== 'boolean') return null
  return {
    solvedAt,
    attempts,
    hintsUsed,
    revealedSolution: value.revealedSolution,
    revealedBeforeSolving: value.revealedBeforeSolving,
  }
}

function readQuiz(value: unknown): QuizProgress | null {
  if (!isPlain(value)) return null
  const bestScore = count(value.bestScore)
  const lastScore = count(value.lastScore)
  const total = count(value.total)
  const attempts = count(value.attempts)
  if (bestScore === null || lastScore === null || total === null || attempts === null) return null
  if (total === 0 || bestScore > total || lastScore > total || attempts === 0 || !isTimestamp(value.lastTakenAt)) return null
  return { bestScore, lastScore, total, attempts, lastTakenAt: value.lastTakenAt }
}

function readRecent(value: unknown): RecentEvent | null {
  if (!isPlain(value)) return null
  const { kind, id, at, detail } = value
  if (kind !== 'lesson' && kind !== 'challenge' && kind !== 'quiz') return null
  if (typeof id !== 'string' || !isId(id) || !isTimestamp(at)) return null
  if (detail !== undefined && (typeof detail !== 'string' || detail.length > 40)) return null
  return detail === undefined ? { kind, id, at } : { kind, id, at, detail }
}

function collect<T>(value: unknown, read: (entry: unknown) => T | null): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [key, entry] of entries(value)) {
    const checked = read(entry)
    if (checked) result[key] = checked
  }
  return result
}

/**
 * Turns stored or imported data into valid progress. Returns null when the
 * data is not SQL Learner progress at all (or is from a newer version), and
 * otherwise keeps every entry that passes its checks.
 */
export function parseProgress(value: unknown): ProgressData | null {
  if (!isPlain(value) || value.version !== PROGRESS_VERSION) return null

  const activity: Record<string, number> = {}
  if (isPlain(value.activity)) {
    for (const [key, entry] of Object.entries(value.activity)) {
      const amount = count(entry)
      if (DAY_KEY.test(key) && amount !== null && amount > 0) activity[key] = amount
    }
  }

  const recent = Array.isArray(value.recent)
    ? value.recent.map(readRecent).filter((event): event is RecentEvent => event !== null).slice(0, RECENT_LIMIT)
    : []

  return {
    version: PROGRESS_VERSION,
    lessons: collect(value.lessons, readLesson),
    challenges: collect(value.challenges, readChallenge),
    quizzes: collect(value.quizzes, readQuiz),
    activity,
    recent,
  }
}

// --- Changes --------------------------------------------------------------------

/** Adds one learning action to today's activity and drops days older than ACTIVITY_DAYS_KEPT. */
export function addActivity(progress: ProgressData, now: Date): ProgressData {
  const today = dayKey(now)
  const oldest = shiftDay(today, -ACTIVITY_DAYS_KEPT)
  const activity: Record<string, number> = {}
  for (const [day, amount] of Object.entries(progress.activity)) {
    if (day > oldest) activity[day] = amount
  }
  activity[today] = (activity[today] ?? 0) + 1
  return { ...progress, activity }
}

/** Puts an event at the top of the recent list, replacing an older event for the same item. */
export function addRecent(progress: ProgressData, event: RecentEvent): ProgressData {
  const others = progress.recent.filter((item) => !(item.kind === event.kind && item.id === event.id))
  return { ...progress, recent: [event, ...others].slice(0, RECENT_LIMIT) }
}

// --- Calculations ---------------------------------------------------------------

export interface StreakSummary {
  /**
   * Consecutive active days ending today. A streak that ended yesterday still
   * counts, because today is not over yet.
   */
  current: number
  longest: number
  /** True when there has been activity today. */
  activeToday: boolean
  /** Days with any activity, in total. */
  activeDays: number
}

export function summarizeStreak(activity: Record<string, number>, now: Date): StreakSummary {
  const days = Object.keys(activity).filter((day) => activity[day] > 0).sort()
  const active = new Set(days)
  const today = dayKey(now)

  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const day of days) {
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }

  const activeToday = active.has(today)
  let current = 0
  let cursor = activeToday ? today : shiftDay(today, -1)
  while (active.has(cursor)) {
    current += 1
    cursor = shiftDay(cursor, -1)
  }

  return { current, longest, activeToday, activeDays: days.length }
}

export interface ActivityDay {
  day: string
  count: number
}

/** The last `length` days, oldest first and ending today, with each day's activity. */
export function recentDays(activity: Record<string, number>, now: Date, length: number): ActivityDay[] {
  const today = dayKey(now)
  return Array.from({ length }, (_, index) => {
    const day = shiftDay(today, index - length + 1)
    return { day, count: activity[day] ?? 0 }
  })
}
