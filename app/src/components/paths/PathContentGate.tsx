import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { isPathPartLoaded, loadPathPart, type PathPart } from '../../content/paths/chapters.ts'
import { Button } from '../ui/Button.tsx'

/**
 * Renders a career path's page once the part of that path it needs is loaded: its content
 * (chapters, exercises, quizzes, project summaries) or its daily-problem list. Each is its own
 * module per path (see plugins/content/pathContent.ts).
 * Until then it shows the same "Loading SQL Path…" line as the lazy route, and if the download
 * fails, a way to try again. Some browsers remember a failed module download for the rest of the
 * visit, so if trying again fails too, it offers to reload the page, as the route error page does
 * (progress is saved, so nothing is lost). The path comes from the route's :pathId.
 */
export function PathContentGate({ part = 'content', children }: { part?: PathPart; children: ReactNode }) {
  const { pathId = '' } = useParams()
  return (
    <Gate key={`${part}/${pathId}`} part={part} pathId={pathId}>
      {children}
    </Gate>
  )
}

function Gate({ part, pathId, children }: { part: PathPart; pathId: string; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(() => (isPathPartLoaded(part, pathId) ? 'ready' : 'loading'))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isPathPartLoaded(part, pathId)) return
    let cancelled = false
    loadPathPart(part, pathId).then(
      () => {
        if (!cancelled) setState('ready')
      },
      () => {
        if (!cancelled) setState('failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [part, pathId, attempt])

  if (state === 'ready') return <>{children}</>
  if (state === 'failed' && attempt > 0) {
    return (
      <div role="alert">
        <p>This path still could not be loaded. Check your connection, then reload the page.</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    )
  }
  if (state === 'failed') {
    return (
      <div role="alert">
        <p>This path could not be loaded. Check your connection and try again.</p>
        <Button
          variant="secondary"
          onClick={() => {
            setState('loading')
            setAttempt((count) => count + 1)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }
  return <p role="status">Loading SQL Path…</p>
}
