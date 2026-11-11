import { problemTextLoaders } from 'virtual:sql-learner-problem-text-index'
import type { PathProblem, PathProblemSummary, ProblemText } from '../types.ts'

/**
 * Loads a daily problem's task, starter query, hints and objectives. They are
 * bundled 30 days per file (plugins/content/problemText.ts), so opening a problem
 * downloads only its own group, once. Reference solutions are never here.
 */

const loaders = problemTextLoaders as Record<string, () => Promise<{ problemText: unknown }>>
const cache = new Map<string, Promise<ProblemText>>()

function loadText(id: string): Promise<ProblemText> {
  const cached = cache.get(id)
  if (cached) return cached
  const loader = loaders[id]
  if (!loader) return Promise.reject(new Error(`No text is bundled for ${id}.`))
  const loading = loader().then(({ problemText }) => {
    const text = (problemText as Record<string, ProblemText>)[id]
    if (!text) throw new Error(`No text is bundled for ${id}.`)
    return text
  })
  // A failed download (for example a lost connection) can be tried again.
  loading.catch(() => cache.delete(id))
  cache.set(id, loading)
  return loading
}

/** The complete problem: its summary from the problem list plus its text. */
export async function loadProblem(summary: PathProblemSummary): Promise<PathProblem> {
  return { ...summary, ...(await loadText(summary.id)) }
}
