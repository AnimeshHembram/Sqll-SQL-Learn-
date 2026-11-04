import { useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonList } from '../components/content/LessonList.tsx'
import { Prose } from '../components/content/Prose.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import {
  findModule,
  formatLessonCount,
  formatLevel,
  formatModuleDuration,
  lessonPath,
} from '../content/index.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import { isLessonComplete, moduleCount } from '../features/progress/progressSummary.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ModulePage.module.css'

export function ModulePage() {
  const { moduleId = '' } = useParams()
  const module = findModule(moduleId)
  const progress = useProgress()

  if (!module) return <NotFoundPage />

  const firstLesson = module.lessons[0]
  const count = moduleCount(module, progress)
  const nextLesson = module.lessons.find((lesson) => !isLessonComplete(progress, module.id, lesson.id))
  const action =
    count.done === 0 || !nextLesson
      ? firstLesson && (
          <Button to={lessonPath(module.id, firstLesson.id)}>
            {count.done === 0 ? 'Start the first lesson' : 'Review from the first lesson'}
          </Button>
        )
      : <Button to={lessonPath(module.id, nextLesson.id)}>Continue: {nextLesson.title}</Button>

  return (
    <>
      <Breadcrumbs items={[{ label: NAV.learn.label, to: NAV.learn.path }]} />
      <PageHeader
        title={module.title}
        description={module.summary}
        actions={action}
      />

      <dl className={styles.facts}>
        <div>
          <dt>Difficulty</dt>
          <dd>{formatLevel(module.level)}</dd>
        </div>
        <div>
          <dt>Lessons</dt>
          <dd>{formatLessonCount(module)}</dd>
        </div>
        <div>
          <dt>Estimated time</dt>
          <dd>{formatModuleDuration(module)}</dd>
        </div>
        <div className={styles.progress}>
          <dt>Your progress</dt>
          <dd>
            {count.done === count.total ? 'All lessons complete' : `${count.done} of ${count.total} lessons complete`}
            <ProgressBar done={count.done} total={count.total} label={`${module.title} lessons complete`} />
          </dd>
        </div>
      </dl>

      <div className={styles.intro}>
        <Prose html={module.introHtml} />
      </div>

      <Card title="Lessons">
        <LessonList module={module} />
      </Card>
    </>
  )
}
