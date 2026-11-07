/**
 * Daily problems: progress, streaks and milestones, calculated from a path's
 * record. Pure functions, so they run in Node for npm run test:paths.
 *
 * - Every written problem is open at any time. Missing a day never locks a
 *   problem or takes anything away.
 * - A streak counts calendar days (in the learner's own time zone) on which at
 *   least one problem was solved. It is shown for motivation only.
 * - Milestones are reached by the number of problems solved, in any order.
 */

import { dayKey, summarizeStreak, type StreakSummary } from '../progress/progressModel.ts'
import type { PathRecord } from './pathModel.ts'

/** The length of every path's daily problem sequence. */
export const PROBLEM_DAYS = 365

export interface Milestone {
  /** Saved in the path record's badges once reached. */
  id: string
  /** Problems solved to reach it. */
  solved: number
  title: string
}

export const PROBLEM_MILESTONES: readonly Milestone[] = [
  { id: 'problems-1', solved: 1, title: 'First problem solved' },
  { id: 'problems-7', solved: 7, title: 'A week of problems' },
  { id: 'problems-30', solved: 30, title: 'Thirty problems' },
  { id: 'problems-50', solved: 50, title: 'Fifty problems' },
  { id: 'problems-100', solved: 100, title: 'One hundred problems' },
  { id: 'problems-200', solved: 200, title: 'Two hundred problems' },
  { id: 'problems-365', solved: 365, title: 'The full year' },
]

export type ProblemState = 'solved' | 'attempted' | 'open' | 'unwritten'

/** The state of a day: unwritten if it has no problem yet. */
export function problemState(problemId: string | undefined, record: PathRecord | undefined): ProblemState {
  if (!problemId) return 'unwritten'
  const saved = record?.problems[problemId]
  if (saved?.solvedAt) return 'solved'
  return saved && saved.attempts > 0 ? 'attempted' : 'open'
}

export function solvedCount(problemIds: readonly string[], record: PathRecord | undefined): number {
  return problemIds.filter((id) => record?.problems[id]?.solvedAt).length
}

/** Streaks over the days on which problems were solved. */
export function problemStreak(problemIds: readonly string[], record: PathRecord | undefined, now: Date): StreakSummary {
  const activity: Record<string, number> = {}
  for (const id of problemIds) {
    const solvedAt = record?.problems[id]?.solvedAt
    if (solvedAt) {
      const day = dayKey(new Date(solvedAt))
      activity[day] = (activity[day] ?? 0) + 1
    }
  }
  return summarizeStreak(activity, now)
}

/** Milestones reached with this many problems solved. */
export function reachedMilestones(solved: number): Milestone[] {
  return PROBLEM_MILESTONES.filter((milestone) => solved >= milestone.solved)
}

/** The first written day not solved yet; null when every written problem is solved. */
export function nextProblemDay(problemIds: readonly string[], record: PathRecord | undefined): number | null {
  const index = problemIds.findIndex((id) => !record?.problems[id]?.solvedAt)
  return index === -1 ? null : index + 1
}
