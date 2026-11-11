/**
 * How solutions are split into chunks the database worker loads on demand.
 *
 * Before Stage 3B the worker imported every solution at start-up, so each new
 * batch of daily problems made the worker bigger for everyone. Now each group
 * below is its own virtual module, imported by the worker only when an answer
 * in that group is checked (or its solution is shown):
 *
 *   virtual:sql-learner-challenge-solutions              the Challenges page (unchanged name)
 *   virtual:sql-learner-solutions-<path>-exercises       one path's chapter exercises
 *   virtual:sql-learner-solutions-<path>-days-001-030    one path's daily problems, 30 days per chunk
 *   virtual:sql-learner-solutions-<path>-project-<id>    one project's tasks
 *
 * The offline build has no separate files, so the same imports are inlined there.
 * Pure function, so npm run test:paths checks it in Node.
 */

export const CHALLENGE_SOLUTIONS_MODULE_ID = 'virtual:sql-learner-challenge-solutions'
export const SOLUTION_GROUP_PREFIX = 'virtual:sql-learner-solutions-'
/** Days per daily-problem chunk: about one month of problems. */
export const DAYS_PER_CHUNK = 30

export interface SolutionGroup {
  moduleId: string
  ids: string[]
}

const pad = (day: number) => String(day).padStart(3, '0')

/** The chunk that holds one daily problem's solution, for example "...data-analyst-days-091-120". */
export function problemGroupId(pathId: string, day: number): string {
  const start = Math.floor((day - 1) / DAYS_PER_CHUNK) * DAYS_PER_CHUNK + 1
  return `${SOLUTION_GROUP_PREFIX}${pathId}-days-${pad(start)}-${pad(start + DAYS_PER_CHUNK - 1)}`
}

/** The chunk that holds one project's solutions, for example "...data-analyst-project-sales-performance-review". */
export function projectGroupId(pathId: string, projectId: string): string {
  return `${SOLUTION_GROUP_PREFIX}${pathId}-project-${projectId}`
}

export function solutionGroups(
  challengeIds: string[],
  exercises: { id: string; pathId: string }[],
  problems: { id: string; pathId: string; day: number }[],
  projectTasks: { id: string; pathId: string; projectId: string }[] = [],
): SolutionGroup[] {
  const groups = new Map<string, string[]>()
  const add = (moduleId: string, id: string) => {
    const ids = groups.get(moduleId) ?? []
    ids.push(id)
    groups.set(moduleId, ids)
  }
  for (const id of challengeIds) add(CHALLENGE_SOLUTIONS_MODULE_ID, id)
  for (const exercise of exercises) add(`${SOLUTION_GROUP_PREFIX}${exercise.pathId}-exercises`, exercise.id)
  for (const problem of problems) add(problemGroupId(problem.pathId, problem.day), problem.id)
  for (const task of projectTasks) add(projectGroupId(task.pathId, task.projectId), task.id)
  return [...groups].map(([moduleId, ids]) => ({ moduleId, ids }))
}
