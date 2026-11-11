import { lazy, Suspense } from 'react'

// SQL Path carries the catalogue of all eight career paths, so its pages are
// loaded only when they are opened. This keeps the first page load the same size.
const PathsPage = lazy(async () => ({ default: (await import('./PathsPage.tsx')).PathsPage }))
const PathPage = lazy(async () => ({ default: (await import('./PathPage.tsx')).PathPage }))
const ChapterPage = lazy(async () => ({ default: (await import('./ChapterPage.tsx')).ChapterPage }))

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

export function ChapterRoute() {
  return (
    <Suspense fallback={loading}>
      <ChapterPage />
    </Suspense>
  )
}

const ProblemsPage = lazy(async () => ({ default: (await import('./ProblemsPage.tsx')).ProblemsPage }))
const ProblemPage = lazy(async () => ({ default: (await import('./ProblemPage.tsx')).ProblemPage }))

export function ProblemsRoute() {
  return (
    <Suspense fallback={loading}>
      <ProblemsPage />
    </Suspense>
  )
}

export function ProblemRoute() {
  return (
    <Suspense fallback={loading}>
      <ProblemPage />
    </Suspense>
  )
}

const ProjectPage = lazy(async () => ({ default: (await import('./ProjectPage.tsx')).ProjectPage }))
const ProjectTaskPage = lazy(async () => ({ default: (await import('./ProjectTaskPage.tsx')).ProjectTaskPage }))

export function ProjectRoute() {
  return (
    <Suspense fallback={loading}>
      <ProjectPage />
    </Suspense>
  )
}

export function ProjectTaskRoute() {
  return (
    <Suspense fallback={loading}>
      <ProjectTaskPage />
    </Suspense>
  )
}
