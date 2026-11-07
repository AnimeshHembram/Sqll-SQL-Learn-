import { NAV } from '../app/navigation.ts'
import { PathCard } from '../components/paths/PathCard.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { lessonPath } from '../content/index.ts'
import { chapterUrl, pathContext } from '../content/paths/chapters.ts'
import { CAREER_PATHS, findPath, pathUrl, type CareerPath } from '../content/paths/catalog.ts'
import { usePathProgress } from '../features/paths/pathStore.ts'
import { nextStep, pathChapterCount } from '../features/paths/pathSummary.ts'
import type { PathRecord } from '../features/paths/pathModel.ts'
import type { ProgressData } from '../features/progress/progressModel.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import styles from './PathsPage.module.css'

export function PathsPage() {
  const progress = useProgress()
  const paths = usePathProgress()
  const current = paths.activePathId ? findPath(paths.activePathId) : undefined

  return (
    <>
      <PageHeader title={NAV.paths.title} description={NAV.paths.description} />

      {current ? (
        <CurrentPath path={current} progress={progress} record={paths.paths[current.id]} />
      ) : (
        <p className={styles.intro}>
          Choose the role you are working towards. Each path starts with the SQL every role needs, then follows its own
          roadmap. You can switch paths at any time: each one keeps its own progress.
        </p>
      )}

      <section aria-labelledby="all-paths" className={styles.section}>
        <h2 id="all-paths" className={styles.sectionTitle}>
          {current ? 'All career paths' : 'Career paths'}
        </h2>
        <div className={styles.grid}>
          {CAREER_PATHS.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              progress={progress}
              current={path.id === current?.id}
              started={Boolean(paths.paths[path.id])}
              context={pathContext(path.id, paths.paths[path.id])}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function CurrentPath({ path, progress, record }: { path: CareerPath; progress: ProgressData; record: PathRecord | undefined }) {
  const context = pathContext(path.id, record)
  const chapters = pathChapterCount(path, progress, context)
  const next = nextStep(path, progress, context)
  return (
    <Card title={`Your current path: ${path.title}`} description={path.tagline} className={styles.current}>
      <div className={styles.currentProgress}>
        <p className={styles.progressText}>
          {chapters.done} of {chapters.total} ready chapters complete · {chapters.planned} more chapters planned
        </p>
        <ProgressBar done={chapters.done} total={chapters.total} label={`${path.title} ready chapters complete`} />
      </div>
      <div className={styles.actions}>
        {next && (
          <Button to={next.lesson ? lessonPath(next.lesson.moduleId, next.lesson.lessonId) : chapterUrl(path.id, next.chapter.id)}>
            Continue: {next.chapter.title}
          </Button>
        )}
        <Button to={pathUrl(path.id)} variant="secondary">
          View roadmap
        </Button>
      </div>
    </Card>
  )
}
