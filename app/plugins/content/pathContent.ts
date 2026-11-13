import type { ContentModule, PathExercise, PathProblem, PathProjectSummary, PathQuiz } from '../../src/content/types.ts'
import { splitProblem } from './problemText.ts'

/**
 * How the SQL Path content is split for loading, so each career path's pages load only that path.
 *
 *   virtual:sql-learner-path-content              the index every SQL Path page gets: per path, its
 *                                                 written chapters' exercise ids and quiz sizes and its
 *                                                 daily-problem ids (enough for progress on the path list
 *                                                 and path page), and loaders for the two modules below
 *   virtual:sql-learner-path-content-<path id>    one path's chapters, exercises (without solutions),
 *                                                 quizzes and project summaries
 *   virtual:sql-learner-path-problems-<path id>   one path's daily-problem summaries (the problem
 *                                                 list and problem pages)
 *
 * Problem text, project text and solutions stay in their own groups (problemText.ts, projectText.ts,
 * solutionGroups.ts). The offline build has no separate files, so the same imports are inlined there.
 */

export const PATH_INDEX_MODULE_ID = 'virtual:sql-learner-path-content'
export const PATH_CONTENT_PREFIX = 'virtual:sql-learner-path-content-'

export const PATH_PROBLEMS_PREFIX = 'virtual:sql-learner-path-problems-'

export function pathContentId(pathId: string): string {
  return `${PATH_CONTENT_PREFIX}${pathId}`
}

export function pathProblemsId(pathId: string): string {
  return `${PATH_PROBLEMS_PREFIX}${pathId}`
}

export interface PathContentInput {
  modules: ContentModule[]
  exercises: PathExercise[]
  quizzes: PathQuiz[]
  problems: PathProblem[]
  projects: { summary: PathProjectSummary }[]
}

/** Every path that has written content of any kind, in a stable order. */
export function writtenPathIds(content: PathContentInput): string[] {
  const ids = new Set<string>([
    ...content.modules.map((module) => module.id),
    ...content.exercises.map((exercise) => exercise.pathId),
    ...content.quizzes.map((quiz) => quiz.pathId),
    ...content.problems.map((problem) => problem.pathId),
    ...content.projects.map((project) => project.summary.pathId),
  ])
  return [...ids].sort()
}

/** Per path: what the path list needs for progress, without loading the path's content. */
export function pathIndex(
  content: PathContentInput,
): Record<string, { chapters: Record<string, { exerciseIds: string[]; quizSize: number }>; problemIds: string[] }> {
  const index: Record<string, { chapters: Record<string, { exerciseIds: string[]; quizSize: number }>; problemIds: string[] }> = {}
  for (const pathId of writtenPathIds(content)) {
    const chapters: Record<string, { exerciseIds: string[]; quizSize: number }> = {}
    for (const lesson of content.modules.find((module) => module.id === pathId)?.lessons ?? []) {
      chapters[lesson.id] = {
        exerciseIds: content.exercises.filter((exercise) => exercise.pathId === pathId && exercise.chapterId === lesson.id).map((exercise) => exercise.id),
        quizSize: content.quizzes.find((quiz) => quiz.pathId === pathId && quiz.id === lesson.id)?.questions.length ?? 0,
      }
    }
    const problemIds = content.problems.filter((problem) => problem.pathId === pathId).map((problem) => problem.id)
    index[pathId] = { chapters, problemIds }
  }
  return index
}

/** The JavaScript of one path's content module. */
export function pathContentModule(content: PathContentInput, pathId: string): string {
  return [
    `export const pathModules = ${JSON.stringify(content.modules.filter((module) => module.id === pathId))};`,
    `export const pathExercises = ${JSON.stringify(content.exercises.filter((exercise) => exercise.pathId === pathId))};`,
    `export const pathQuizzes = ${JSON.stringify(content.quizzes.filter((quiz) => quiz.pathId === pathId))};`,
    // Without the brief and task text: those load with the project (projectText.ts).
    `export const pathProjects = ${JSON.stringify(content.projects.filter((project) => project.summary.pathId === pathId).map((project) => project.summary))};`,
  ].join('\n')
}

/** The JavaScript of one path's daily-problem summaries (without the task text, starter query and hints: problemText.ts). */
export function pathProblemsModule(content: PathContentInput, pathId: string): string {
  return `export const pathProblems = ${JSON.stringify(content.problems.filter((problem) => problem.pathId === pathId).map((problem) => splitProblem(problem).summary))};`
}

/** The JavaScript of the index module. */
export function pathIndexModule(content: PathContentInput): string {
  const ids = writtenPathIds(content)
  const loaders = ids.map((pathId) => `  ${JSON.stringify(pathId)}: () => import(${JSON.stringify(pathContentId(pathId))})`)
  const problemLoaders = ids
    .filter((pathId) => content.problems.some((problem) => problem.pathId === pathId))
    .map((pathId) => `  ${JSON.stringify(pathId)}: () => import(${JSON.stringify(pathProblemsId(pathId))})`)
  return [
    `export const pathIndex = ${JSON.stringify(pathIndex(content))};`,
    `export const pathContentLoaders = {\n${loaders.join(',\n')}\n};`,
    `export const pathProblemLoaders = {\n${problemLoaders.join(',\n')}\n};`,
  ].join('\n')
}
