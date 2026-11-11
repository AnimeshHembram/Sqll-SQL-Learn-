import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { loadChallenges } from './loadChallenges.ts'
import { loadContent } from './loadContent.ts'
import { loadPathContent } from './loadPathContent.ts'
import { loadQuizzes } from './loadQuizzes.ts'
import { PROBLEM_TEXT_GROUP_PREFIX, PROBLEM_TEXT_INDEX_MODULE_ID, problemTextGroups, splitProblem } from './problemText.ts'
import { PROJECT_INDEX_MODULE_ID, PROJECT_TEXT_PREFIX, projectKey, projectTextId } from './projectText.ts'
import { CHALLENGE_SOLUTIONS_MODULE_ID, SOLUTION_GROUP_PREFIX, solutionGroups } from './solutionGroups.ts'

/**
 * Vite plugin that turns the Markdown lessons, challenges and quizzes into
 * JavaScript modules.
 *
 * - `npm run build` fails with a list of every content problem.
 * - `npm run dev` shows content problems in the browser error overlay and
 *   updates the page when a content file is edited, added or removed.
 *
 * The app imports lessons, challenges (without solutions) and quizzes from
 * `virtual:sql-learner-content`. Solutions are never part of the page's code:
 * only the database worker imports them, through
 * `virtual:sql-learner-solution-index`, which maps each challenge, exercise and
 * daily problem to a loader for its group (see solutionGroups.ts). A group is
 * downloaded when one of its answers is first checked, and the page asks the
 * worker for a solution only when the learner chooses to see it.
 *
 * Daily problems are split the same way for the page: `virtual:sql-learner-path-content`
 * lists every problem without its text, and `virtual:sql-learner-problem-text-index`
 * loads the task, starter query and hints 30 days at a time (see problemText.ts).
 * Projects likewise: their summaries are in the path content, and each project's brief and task
 * text is its own module behind `virtual:sql-learner-project-index` (see projectText.ts).
 */

export const CONTENT_MODULE_ID = 'virtual:sql-learner-content'
export const SOLUTION_INDEX_MODULE_ID = 'virtual:sql-learner-solution-index'
/** SQL Path chapters, exercises (without solutions) and quizzes, imported only by the SQL Path pages. */
export const PATH_CONTENT_MODULE_ID = 'virtual:sql-learner-path-content'
const RESOLVED_ID = '\0' + CONTENT_MODULE_ID
const RESOLVED_INDEX_ID = '\0' + SOLUTION_INDEX_MODULE_ID
const isSolutionGroup = (id: string) => id === CHALLENGE_SOLUTIONS_MODULE_ID || id.startsWith(SOLUTION_GROUP_PREFIX)
const RESOLVED_PATH_ID = '\0' + PATH_CONTENT_MODULE_ID
const RESOLVED_TEXT_INDEX_ID = '\0' + PROBLEM_TEXT_INDEX_MODULE_ID
const isTextGroup = (id: string) => id.startsWith(PROBLEM_TEXT_GROUP_PREFIX) && id !== PROBLEM_TEXT_INDEX_MODULE_ID
const RESOLVED_PROJECT_INDEX_ID = '\0' + PROJECT_INDEX_MODULE_ID
const isProjectText = (id: string) => id.startsWith(PROJECT_TEXT_PREFIX) && id !== PROJECT_INDEX_MODULE_ID

interface ContentPluginOptions {
  /** Absolute path to the folder that holds the module folders. */
  dir: string
  /** Absolute path to the folder that holds the sample datasets (.sql). */
  datasetsDir: string
  /** Absolute path to the folder that holds the challenge files. */
  challengesDir: string
  /** Absolute path to the folder that holds the quiz files. */
  quizzesDir: string
  /** Absolute path to the SQL Path content folder. Defaults to "paths-content" next to `dir`. */
  pathsDir?: string
}

/** Loads and validates all content. Takes a few milliseconds, so there is no cache to go stale. */
export function loadAllContent({ dir, datasetsDir, challengesDir, quizzesDir, pathsDir }: ContentPluginOptions) {
  const content = loadContent(dir, datasetsDir)
  const challenges = loadChallenges(challengesDir, datasetsDir, new Set(content.modules.map((module) => module.id)))
  const quizzes = loadQuizzes(quizzesDir)
  const paths = loadPathContent(pathsDir ?? path.join(path.dirname(dir), 'paths-content'), datasetsDir, new Set(Object.keys(challenges.solutions)))
  return {
    modules: content.modules,
    challenges: challenges.challenges,
    /** Challenge and SQL Path exercise solutions: the database worker evaluates both the same way. */
    solutions: { ...challenges.solutions, ...paths.solutions },
    /** Author-only test data for scripts/check-challenges.ts; never bundled. */
    wrongAnswers: { ...challenges.wrongAnswers, ...paths.wrongAnswers },
    sourceFiles: { ...challenges.sourceFiles, ...paths.sourceFiles },
    quizzes: quizzes.quizzes,
    pathModules: paths.modules,
    pathExercises: paths.exercises,
    pathQuizzes: paths.quizzes,
    pathProblems: paths.problems,
    pathProjects: paths.projects,
    /** Every project task with its full text, for the checks. */
    pathProjectTasks: paths.projectTasks,
    errors: [...content.errors, ...challenges.errors, ...quizzes.errors, ...paths.errors],
    files: [...new Set([...content.files, ...challenges.files, ...quizzes.files, ...paths.files])],
  }
}

function formatErrors(errors: string[]): string {
  const count = `${errors.length} problem${errors.length === 1 ? '' : 's'}`
  return `Content check failed (${count}):\n  - ${errors.join('\n  - ')}`
}

export function contentPlugin(options: ContentPluginOptions): Plugin {
  const { dir, datasetsDir, challengesDir, quizzesDir } = options
  const isInside = (folder: string, file: string) => {
    const relative = path.relative(folder, file)
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  }
  const pathsDir = options.pathsDir ?? path.join(path.dirname(dir), 'paths-content')
  const isContentFile = (file: string) => [dir, datasetsDir, challengesDir, quizzesDir, pathsDir].some((folder) => isInside(folder, file))

  // True while the content has errors. Vite does not retry a module whose last
  // load failed, so the next change to a content file forces a reload.
  let lastLoadFailed = false

  // Edits to existing files are picked up through addWatchFile in load(). New and
  // deleted files are not dependencies yet, and a failed load needs a retry, so
  // those cases reload the content module here.
  const reloadContent = (server: ViteDevServer) => (file: string) => {
    if (!isContentFile(file)) return
    const graph = server.environments.client.moduleGraph
    // The content modules, the solution index and every solution group (the worker's modules live in the same graph in dev).
    for (const module of graph.idToModuleMap.values()) {
      const id = module.id ?? ''
      const resolvedGroup = id.startsWith('\0') && (isSolutionGroup(id.slice(1)) || isTextGroup(id.slice(1)) || isProjectText(id.slice(1)))
      const index = [RESOLVED_ID, RESOLVED_INDEX_ID, RESOLVED_PATH_ID, RESOLVED_TEXT_INDEX_ID, RESOLVED_PROJECT_INDEX_ID].includes(id)
      if (index || resolvedGroup) {
        graph.invalidateModule(module)
      }
    }
    server.environments.client.hot.send({ type: 'full-reload' })
  }

  return {
    name: 'sql-learner-content',

    resolveId(id) {
      if (id === CONTENT_MODULE_ID) return RESOLVED_ID
      if (id === SOLUTION_INDEX_MODULE_ID) return RESOLVED_INDEX_ID
      if (isSolutionGroup(id)) return '\0' + id
      if (id === PATH_CONTENT_MODULE_ID) return RESOLVED_PATH_ID
      if (id === PROBLEM_TEXT_INDEX_MODULE_ID) return RESOLVED_TEXT_INDEX_ID
      if (isTextGroup(id)) return '\0' + id
      if (id === PROJECT_INDEX_MODULE_ID) return RESOLVED_PROJECT_INDEX_ID
      if (isProjectText(id)) return '\0' + id
      return undefined
    },

    load(id) {
      const groupId = id.startsWith('\0') && isSolutionGroup(id.slice(1)) ? id.slice(1) : null
      const textGroupId = id.startsWith('\0') && isTextGroup(id.slice(1)) ? id.slice(1) : null
      const projectTextModule = id.startsWith('\0') && isProjectText(id.slice(1)) ? id.slice(1) : null
      const known = [RESOLVED_ID, RESOLVED_INDEX_ID, RESOLVED_PATH_ID, RESOLVED_TEXT_INDEX_ID, RESOLVED_PROJECT_INDEX_ID].includes(id)
      if (!known && !groupId && !textGroupId && !projectTextModule) return undefined
      const { modules, challenges, solutions, quizzes, pathModules, pathExercises, pathQuizzes, pathProblems, pathProjects, pathProjectTasks, errors, files } =
        loadAllContent(options)
      for (const file of files) this.addWatchFile(file)
      lastLoadFailed = errors.length > 0
      if (lastLoadFailed) this.error(formatErrors(errors))
      const groups = solutionGroups(challenges.map((challenge) => challenge.id), pathExercises, pathProblems, pathProjectTasks)
      if (id === RESOLVED_INDEX_ID) {
        // One loader per group; each id points at its group's loader.
        const loaders = groups.map((group, index) => `const g${index} = () => import(${JSON.stringify(group.moduleId)});`)
        const entries = groups.flatMap((group, index) => group.ids.map((solutionId) => `${JSON.stringify(solutionId)}: g${index}`))
        return `${loaders.join('\n')}\nexport const solutionLoaders = {\n  ${entries.join(',\n  ')}\n};`
      }
      if (groupId) {
        const group = groups.find((candidate) => candidate.moduleId === groupId)
        if (!group) this.error(`There is no solution group "${groupId}".`)
        const subset = Object.fromEntries(group.ids.map((solutionId) => [solutionId, solutions[solutionId]]))
        return `export const solutions = ${JSON.stringify(subset)};`
      }
      const textGroups = problemTextGroups(pathProblems)
      if (id === RESOLVED_TEXT_INDEX_ID) {
        const loaders = textGroups.map((group, index) => `const t${index} = () => import(${JSON.stringify(group.moduleId)});`)
        const entries = textGroups.flatMap((group, index) => group.ids.map((problemId) => `${JSON.stringify(problemId)}: t${index}`))
        return `${loaders.join('\n')}\nexport const problemTextLoaders = {\n  ${entries.join(',\n  ')}\n};`
      }
      if (textGroupId) {
        const group = textGroups.find((candidate) => candidate.moduleId === textGroupId)
        if (!group) this.error(`There is no problem text group "${textGroupId}".`)
        const byId = new Map(pathProblems.map((problem) => [problem.id, problem]))
        const subset = Object.fromEntries(group.ids.map((problemId) => [problemId, splitProblem(byId.get(problemId)!).text]))
        return `export const problemText = ${JSON.stringify(subset)};`
      }
      if (id === RESOLVED_PROJECT_INDEX_ID) {
        const loaders = pathProjects.map(
          ({ summary }) => `  ${JSON.stringify(projectKey(summary.pathId, summary.id))}: () => import(${JSON.stringify(projectTextId(summary.pathId, summary.id))})`,
        )
        return `export const projectLoaders = {\n${loaders.join(',\n')}\n};`
      }
      if (projectTextModule) {
        const project = pathProjects.find(({ summary }) => projectTextId(summary.pathId, summary.id) === projectTextModule)
        if (!project) this.error(`There is no project "${projectTextModule}".`)
        return `export const projectText = ${JSON.stringify(project.text)};`
      }
      if (id === RESOLVED_PATH_ID) {
        return [
          `export const pathModules = ${JSON.stringify(pathModules)};`,
          `export const pathExercises = ${JSON.stringify(pathExercises)};`,
          `export const pathQuizzes = ${JSON.stringify(pathQuizzes)};`,
          // Without the task text, starter query and hints: those load per 30 days (problemText.ts).
          `export const pathProblems = ${JSON.stringify(pathProblems.map((problem) => splitProblem(problem).summary))};`,
          // Without the brief and task text: those load with the project (projectText.ts).
          `export const pathProjects = ${JSON.stringify(pathProjects.map((project) => project.summary))};`,
        ].join('\n')
      }
      return [
        `export const modules = ${JSON.stringify(modules)};`,
        `export const challenges = ${JSON.stringify(challenges)};`,
        `export const quizzes = ${JSON.stringify(quizzes)};`,
      ].join('\n')
    },

    configureServer(server) {
      server.watcher.add([dir, datasetsDir, challengesDir, quizzesDir, pathsDir])
      const reload = reloadContent(server)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
      server.watcher.on('change', (file) => {
        if (lastLoadFailed) reload(file)
      })
    },
  }
}
