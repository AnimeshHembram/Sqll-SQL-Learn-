import type { PathProblem, PathProblemSummary, ProblemText } from '../../src/content/types.ts'
import { DAYS_PER_CHUNK } from './solutionGroups.ts'

/**
 * How daily-problem text is split from the problem list, so it loads 30 days at a time.
 *
 * The SQL Path pages import a light index of every problem (id, day, title, topic,
 * difficulty, summary, tables, expected shape): enough for the 365-day map, the
 * filters, progress and previous/next links. The heavy text a learner only needs
 * on the problem's own page (task, starter query, hints, objectives, prerequisites)
 * is in one virtual module per 30 days, imported when a problem in it is opened:
 *
 *   virtual:sql-learner-problem-text-index                      day id → loader for its group
 *   virtual:sql-learner-problem-text-<path>-days-001-030        the text of Days 1 to 30, and so on
 *
 * Reference solutions are not here: they stay in the worker's own groups (solutionGroups.ts).
 * The offline build has no separate files, so the same imports are inlined there.
 * Pure functions, so npm run test:paths checks them in Node.
 */

export const PROBLEM_TEXT_INDEX_MODULE_ID = 'virtual:sql-learner-problem-text-index'
export const PROBLEM_TEXT_GROUP_PREFIX = 'virtual:sql-learner-problem-text-'
export const PROBLEM_TEXT_FIELDS = ['descriptionHtml', 'starterSql', 'hints', 'objectives', 'prerequisites'] as const

const pad = (day: number) => String(day).padStart(3, '0')

/** The group that holds one day's text, for example "virtual:sql-learner-problem-text-data-analyst-days-121-150". */
export function problemTextGroupId(pathId: string, day: number): string {
  const start = Math.floor((day - 1) / DAYS_PER_CHUNK) * DAYS_PER_CHUNK + 1
  return `${PROBLEM_TEXT_GROUP_PREFIX}${pathId}-days-${pad(start)}-${pad(start + DAYS_PER_CHUNK - 1)}`
}

/** Splits a problem into the light part every SQL Path page gets and the text only its own page loads. */
export function splitProblem(problem: PathProblem): { summary: PathProblemSummary; text: ProblemText } {
  const { descriptionHtml, starterSql, hints, objectives, prerequisites, ...summary } = problem
  return { summary, text: { descriptionHtml, starterSql, hints, objectives, prerequisites } }
}

export function problemTextGroups(problems: { id: string; pathId: string; day: number }[]): { moduleId: string; ids: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const problem of problems) {
    const moduleId = problemTextGroupId(problem.pathId, problem.day)
    groups.set(moduleId, [...(groups.get(moduleId) ?? []), problem.id])
  }
  return [...groups].map(([moduleId, ids]) => ({ moduleId, ids }))
}
