import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { loadChallenges } from './loadChallenges.ts'
import { loadContent } from './loadContent.ts'
import { loadQuizzes } from './loadQuizzes.ts'

/**
 * Vite plugin that turns the Markdown lessons, challenges and quizzes into
 * JavaScript modules.
 *
 * - `npm run build` fails with a list of every content problem.
 * - `npm run dev` shows content problems in the browser error overlay and
 *   updates the page when a content file is edited, added or removed.
 *
 * The app imports lessons, challenges (without solutions) and quizzes from
 * `virtual:sql-learner-content`. Challenge solutions are a separate module,
 * `virtual:sql-learner-challenge-solutions`, imported statically only by the
 * database worker and dynamically by the challenge page when the learner asks
 * to see a solution, so they are never part of the main bundle.
 */

export const CONTENT_MODULE_ID = 'virtual:sql-learner-content'
export const SOLUTIONS_MODULE_ID = 'virtual:sql-learner-challenge-solutions'
const RESOLVED_ID = '\0' + CONTENT_MODULE_ID
const RESOLVED_SOLUTIONS_ID = '\0' + SOLUTIONS_MODULE_ID

interface ContentPluginOptions {
  /** Absolute path to the folder that holds the module folders. */
  dir: string
  /** Absolute path to the folder that holds the sample datasets (.sql). */
  datasetsDir: string
  /** Absolute path to the folder that holds the challenge files. */
  challengesDir: string
  /** Absolute path to the folder that holds the quiz files. */
  quizzesDir: string
}

/** Loads and validates all content. Takes a few milliseconds, so there is no cache to go stale. */
export function loadAllContent({ dir, datasetsDir, challengesDir, quizzesDir }: ContentPluginOptions) {
  const content = loadContent(dir, datasetsDir)
  const challenges = loadChallenges(challengesDir, datasetsDir, new Set(content.modules.map((module) => module.id)))
  const quizzes = loadQuizzes(quizzesDir)
  return {
    modules: content.modules,
    challenges: challenges.challenges,
    solutions: challenges.solutions,
    /** Author-only test data for scripts/check-challenges.ts; never bundled. */
    wrongAnswers: challenges.wrongAnswers,
    sourceFiles: challenges.sourceFiles,
    quizzes: quizzes.quizzes,
    errors: [...content.errors, ...challenges.errors, ...quizzes.errors],
    files: [...new Set([...content.files, ...challenges.files, ...quizzes.files])],
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
  const isContentFile = (file: string) => [dir, datasetsDir, challengesDir, quizzesDir].some((folder) => isInside(folder, file))

  // True while the content has errors. Vite does not retry a module whose last
  // load failed, so the next change to a content file forces a reload.
  let lastLoadFailed = false

  // Edits to existing files are picked up through addWatchFile in load(). New and
  // deleted files are not dependencies yet, and a failed load needs a retry, so
  // those cases reload the content module here.
  const reloadContent = (server: ViteDevServer) => (file: string) => {
    if (!isContentFile(file)) return
    const graph = server.environments.client.moduleGraph
    for (const id of [RESOLVED_ID, RESOLVED_SOLUTIONS_ID]) {
      const module = graph.getModuleById(id)
      if (module) graph.invalidateModule(module)
    }
    server.environments.client.hot.send({ type: 'full-reload' })
  }

  return {
    name: 'sql-learner-content',

    resolveId(id) {
      if (id === CONTENT_MODULE_ID) return RESOLVED_ID
      if (id === SOLUTIONS_MODULE_ID) return RESOLVED_SOLUTIONS_ID
      return undefined
    },

    load(id) {
      if (id !== RESOLVED_ID && id !== RESOLVED_SOLUTIONS_ID) return undefined
      const { modules, challenges, solutions, quizzes, errors, files } = loadAllContent(options)
      for (const file of files) this.addWatchFile(file)
      lastLoadFailed = errors.length > 0
      if (lastLoadFailed) this.error(formatErrors(errors))
      if (id === RESOLVED_SOLUTIONS_ID) return `export const solutions = ${JSON.stringify(solutions)};`
      return [
        `export const modules = ${JSON.stringify(modules)};`,
        `export const challenges = ${JSON.stringify(challenges)};`,
        `export const quizzes = ${JSON.stringify(quizzes)};`,
      ].join('\n')
    },

    configureServer(server) {
      server.watcher.add([dir, datasetsDir, challengesDir, quizzesDir])
      const reload = reloadContent(server)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
      server.watcher.on('change', (file) => {
        if (lastLoadFailed) reload(file)
      })
    },
  }
}
