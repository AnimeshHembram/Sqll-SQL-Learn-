import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { ChapterState } from '../components/paths/ChapterState.tsx'
import { Roadmap } from '../components/paths/Roadmap.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { lessonPath } from '../content/index.ts'
import { PROBLEMS_PER_PATH, findPath } from '../content/paths/catalog.ts'
import { choosePath, usePathProgress } from '../features/paths/pathStore.ts'
import { nextStep, pathChapterCount } from '../features/paths/pathSummary.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './PathPage.module.css'

const PLANNED = { state: 'planned', lessons: { done: 0, total: 0 } } as const

export function PathPage() {
  const { pathId = '' } = useParams()
  const path = findPath(pathId)
  const progress = useProgress()
  const paths = usePathProgress()
  const [message, setMessage] = useState('')
  const messageRef = useRef<HTMLParagraphElement>(null)

  if (!path) return <NotFoundPage />

  const isCurrent = paths.activePathId === path.id
  const record = paths.paths[path.id]
  const chapters = pathChapterCount(path, progress)
  const next = nextStep(path, progress)
  const previous = paths.activePathId && !isCurrent ? findPath(paths.activePathId) : undefined

  const select = () => {
    const saved = choosePath(path.id)
    const kept = previous ? ` Your ${previous.title} progress is kept.` : ''
    setMessage(
      saved
        ? `${path.title} is now your current path.${kept}`
        : `${path.title} is your current path for this visit. This browser is blocking storage, so it will not be remembered.`,
    )
    // The button disappears once the path is current, so focus moves to the confirmation.
    requestAnimationFrame(() => messageRef.current?.focus())
  }

  return (
    <>
      <Breadcrumbs items={[{ label: NAV.paths.label, to: NAV.paths.path }]} />
      <PageHeader
        title={path.title}
        documentTitle={`${path.title} path`}
        description={path.tagline}
        meta={isCurrent ? 'This is your current path.' : record ? 'You have followed this path before. Its progress is kept.' : undefined}
        actions={
          <>
            {!isCurrent && (
              <Button onClick={select}>{previous ? `Switch to ${path.title}` : 'Make this my current path'}</Button>
            )}
            {next && (
              <Button to={lessonPath(next.lesson.moduleId, next.lesson.lessonId)} variant={isCurrent ? 'primary' : 'secondary'}>
                {chapters.done === 0 && next.chapter === path.stages[0]?.chapters[0] ? 'Start' : 'Continue'}: {next.chapter.title}
              </Button>
            )}
          </>
        }
      />
      <p ref={messageRef} tabIndex={-1} role="status" className={styles.message}>
        {message}
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>Stages</dt>
          <dd>{path.stages.length}</dd>
        </div>
        <div>
          <dt>Chapters</dt>
          <dd>
            {chapters.total} ready, {chapters.planned} planned
          </dd>
        </div>
        <div>
          <dt>Daily problems</dt>
          <dd>{PROBLEMS_PER_PATH} planned</dd>
        </div>
        <div>
          <dt>Projects</dt>
          <dd>{path.projects.length} planned</dd>
        </div>
        <div className={styles.progress}>
          <dt>Your progress</dt>
          <dd>
            {chapters.total > 0 && chapters.done === chapters.total
              ? 'All ready chapters complete'
              : `${chapters.done} of ${chapters.total} ready chapters complete`}
            <ProgressBar done={chapters.done} total={chapters.total} label={`${path.title} ready chapters complete`} />
          </dd>
        </div>
      </dl>

      <Card title="About this path" className={styles.about}>
        <p className={styles.audience}>{path.audience}</p>
        <h3 className={styles.subheading}>By the end you will be able to</h3>
        <ul className={styles.outcomes}>
          {path.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
      </Card>

      <h2 className={styles.roadmapTitle}>Roadmap</h2>
      <p className={styles.roadmapNote}>
        Ready chapters link to the Learn SQL lessons that teach them, and only they count towards your progress. Planned
        chapters are shown so you can see where the path goes; they are added in later updates.
      </p>
      <Roadmap path={path} progress={progress} />

      <Card title="Projects" description="Three real-world projects that bring the path together." className={styles.projects}>
        <ul className={styles.projectList}>
          {path.projects.map((project) => (
            <li key={project.id} className={styles.project}>
              <div className={styles.projectHead}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <ChapterState status={PLANNED} />
              </div>
              <p className={styles.projectSummary}>{project.summary}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
