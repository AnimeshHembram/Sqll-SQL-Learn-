import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonList } from '../components/content/LessonList.tsx'
import { ResultTable } from '../components/sql/ResultTable.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { MODULES, describeModule, findFirstLesson, lessonPath, modulePath, type LessonLocation } from '../content/index.ts'
import { isNewLearner, lessonToContinue } from '../content/lastLesson.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import { moduleCount } from '../features/progress/progressSummary.ts'
import styles from './LearnPage.module.css'

/** What every lesson asks of the learner, in order. */
const LESSON_STEPS = ['Learn a concept', 'See an example', 'Try it yourself', 'Check your understanding']

/** The lesson example previewed for newcomers. Its result table is checked by npm run check:examples. */
const PREVIEW = { moduleId: 'sql-fundamentals', lessonId: 'filtering-with-where', sql: 'WHERE price < 12' }

export function LearnPage() {
  const progress = useProgress()
  const isNew = isNewLearner(progress)
  const first = findFirstLesson()
  const next = isNew ? first : lessonToContinue(progress)

  return (
    <>
      <PageHeader
        title={NAV.learn.title}
        description={NAV.learn.description}
        meta={next && describeNext(next, isNew)}
        actions={
          next && <Button to={lessonPath(next.module.id, next.lesson.id)}>{isNew ? 'Start lesson 1' : 'Continue learning'}</Button>
        }
      />

      {MODULES.length === 0 ? (
        <Card title="Modules">
          <EmptyState title="No modules yet">Lessons will be listed here as they are added.</EmptyState>
        </Card>
      ) : (
        <>
          <div className={styles.steps}>
            <p className={styles.stepsLabel}>How each lesson works</p>
            <ol className={styles.stepList}>
              {LESSON_STEPS.map((step, index) => (
                <li key={step}>
                  {index > 0 && (
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  )}
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.modules}>
            {MODULES.map((module) => {
              const count = moduleCount(module, progress)
              return (
                <Card key={module.id} title={module.title} description={describeModule(module)}>
                  <p className={styles.summary}>{module.summary}</p>
                  {isNew && module.id === PREVIEW.moduleId && <QueryPreview />}
                  <div className={styles.progress}>
                    <p className={styles.progressText}>
                      {count.done} of {count.total} lessons complete
                    </p>
                    <ProgressBar done={count.done} total={count.total} label={`${module.title} lessons complete`} />
                  </div>
                  <LessonList module={module} />
                  <p className={styles.overview}>
                    <Link to={modulePath(module.id)}>About this module</Link>
                  </p>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

/** For example "Lesson 1: What is SQL? (about 10 minutes)". */
function describeNext({ module, lesson, index }: LessonLocation, isNew: boolean): string {
  const position = isNew ? `Lesson ${index + 1}` : `Up next in ${module.title}, lesson ${index + 1}`
  return `${position}: ${lesson.title} (about ${lesson.durationMinutes} minutes)`
}

/** A small query and its result, taken from a lesson so it always matches what the lessons teach. */
function QueryPreview() {
  const module = MODULES.find((item) => item.id === PREVIEW.moduleId)
  const index = module?.lessons.findIndex((item) => item.id === PREVIEW.lessonId) ?? -1
  const lesson = module?.lessons[index]
  const example = lesson?.examples.find((item) => item.kind === 'example' && item.sql.includes(PREVIEW.sql))
  if (!module || !lesson || !example?.expected) return null

  return (
    <figure className={styles.preview}>
      <figcaption className={styles.previewCaption}>
        A query you will write in{' '}
        <Link to={lessonPath(module.id, lesson.id)}>
          lesson {index + 1}: {lesson.title}
        </Link>
      </figcaption>
      <pre className={styles.previewCode}>
        <code>{example.sql.trim()}</code>
      </pre>
      <ResultTable columns={example.expected.columns} rows={example.expected.rows} label="Example result" />
    </figure>
  )
}
