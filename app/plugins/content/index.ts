import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { loadContent } from './loadContent.ts'

/**
 * Vite plugin that turns the Markdown lessons into a JavaScript module.
 *
 * - `npm run build` fails with a list of every content problem.
 * - `npm run dev` shows content problems in the browser error overlay and
 *   updates the page when a lesson file is edited, added or removed.
 *
 * The app imports the result from `virtual:sql-learner-content`.
 */

export const CONTENT_MODULE_ID = 'virtual:sql-learner-content'
const RESOLVED_ID = '\0' + CONTENT_MODULE_ID

interface ContentPluginOptions {
  /** Absolute path to the folder that holds the module folders. */
  dir: string
  /** Absolute path to the folder that holds the sample datasets (.sql). */
  datasetsDir: string
}

function formatErrors(errors: string[]): string {
  const count = `${errors.length} problem${errors.length === 1 ? '' : 's'}`
  return `Content check failed (${count}):\n  - ${errors.join('\n  - ')}`
}

export function contentPlugin({ dir, datasetsDir }: ContentPluginOptions): Plugin {
  const isInside = (folder: string, file: string) => {
    const relative = path.relative(folder, file)
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  }
  const isContentFile = (file: string) => isInside(dir, file) || isInside(datasetsDir, file)

  // True while the content has errors. Vite does not retry a module whose last
  // load failed, so the next change to a content file forces a reload.
  let lastLoadFailed = false

  // Edits to existing files are picked up through addWatchFile in load(). New and
  // deleted files are not dependencies yet, and a failed load needs a retry, so
  // those cases reload the content module here.
  const reloadContent = (server: ViteDevServer) => (file: string) => {
    if (!isContentFile(file)) return
    const graph = server.environments.client.moduleGraph
    const module = graph.getModuleById(RESOLVED_ID)
    if (module) graph.invalidateModule(module)
    server.environments.client.hot.send({ type: 'full-reload' })
  }

  return {
    name: 'sql-learner-content',

    resolveId(id) {
      return id === CONTENT_MODULE_ID ? RESOLVED_ID : undefined
    },

    load(id) {
      if (id !== RESOLVED_ID) return undefined
      // Six small Markdown files take a few milliseconds, so there is no cache to go stale.
      const { modules, errors, files } = loadContent(dir, datasetsDir)
      for (const file of files) this.addWatchFile(file)
      lastLoadFailed = errors.length > 0
      if (lastLoadFailed) this.error(formatErrors(errors))
      return `export const modules = ${JSON.stringify(modules)};`
    },

    configureServer(server) {
      server.watcher.add([dir, datasetsDir])
      const reload = reloadContent(server)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
      server.watcher.on('change', (file) => {
        if (lastLoadFailed) reload(file)
      })
    },
  }
}
