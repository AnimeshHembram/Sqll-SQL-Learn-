import { lazy, Suspense } from 'react'

// A challenge carries the SQL editor, so its code is loaded only when a challenge is opened.
const ChallengePage = lazy(async () => ({ default: (await import('./ChallengePage.tsx')).ChallengePage }))

export function ChallengeRoute() {
  return (
    <Suspense fallback={<p role="status">Loading the challenge…</p>}>
      <ChallengePage />
    </Suspense>
  )
}
