import { lazy, Suspense } from 'react'

// The practice space carries the SQL editor, so its code is loaded only when the page is opened.
const PracticePage = lazy(async () => ({ default: (await import('./PracticePage.tsx')).PracticePage }))

export function PracticeRoute() {
  return (
    <Suspense fallback={<p role="status">Loading the practice space…</p>}>
      <PracticePage />
    </Suspense>
  )
}
