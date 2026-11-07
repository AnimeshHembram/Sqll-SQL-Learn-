import { lazy, Suspense } from 'react'

// SQL Path carries the catalogue of all eight career paths, so its pages are
// loaded only when they are opened. This keeps the first page load the same size.
const PathsPage = lazy(async () => ({ default: (await import('./PathsPage.tsx')).PathsPage }))
const PathPage = lazy(async () => ({ default: (await import('./PathPage.tsx')).PathPage }))

const loading = <p role="status">Loading SQL Path…</p>

export function PathsRoute() {
  return (
    <Suspense fallback={loading}>
      <PathsPage />
    </Suspense>
  )
}

export function PathRoute() {
  return (
    <Suspense fallback={loading}>
      <PathPage />
    </Suspense>
  )
}
