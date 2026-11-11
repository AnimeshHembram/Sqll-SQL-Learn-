import type { ProblemText, ProjectTask, ProjectTaskSummary } from '../../src/content/types.ts'

/**
 * How SQL Path projects are split for loading.
 *
 * Every SQL Path page gets a light summary of each written project (its milestones and the
 * title, topic and expected shape of each task) through virtual:sql-learner-path-content, enough
 * for the path page, progress and navigation. The brief and the task text load with the
 * project's own page, one virtual module per project:
 *
 *   virtual:sql-learner-project-index                      "<path>/<project>" → loader for its text
 *   virtual:sql-learner-project-<path>-<project>           the brief's sections and every task's text
 *
 * Reference solutions are in the worker's own group for the project
 * (virtual:sql-learner-solutions-<path>-project-<project>, see solutionGroups.ts), and the
 * project's dataset is loaded by the worker only when one of its tasks runs.
 * The offline build has no separate files, so the same imports are inlined there.
 */

export const PROJECT_INDEX_MODULE_ID = 'virtual:sql-learner-project-index'
export const PROJECT_TEXT_PREFIX = 'virtual:sql-learner-project-'

export function projectTextId(pathId: string, projectId: string): string {
  return `${PROJECT_TEXT_PREFIX}${pathId}-${projectId}`
}

/** The key a project's loader is found under in the index. */
export function projectKey(pathId: string, projectId: string): string {
  return `${pathId}/${projectId}`
}

/** Splits a task into the light part every SQL Path page gets and the text only the project's pages load. */
export function splitTask(task: ProjectTask): { summary: ProjectTaskSummary; text: ProblemText } {
  const { descriptionHtml, starterSql, hints, objectives, prerequisites, ...summary } = task
  return { summary, text: { descriptionHtml, starterSql, hints, objectives, prerequisites } }
}
