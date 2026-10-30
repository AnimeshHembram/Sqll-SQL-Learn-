import { useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonList } from '../components/content/LessonList.tsx'
import { Prose } from '../components/content/Prose.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import {
  findModule,
  formatLessonCount,
  formatLevel,
  formatModuleDuration,
  lessonPath,
} from '../content/index.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ModulePage.module.css'

export function ModulePage() {
  const { moduleId = '' } = useParams()
  const module = findModule(moduleId)

  if (!module) return <NotFoundPage />

  const firstLesson = module.lessons[0]

  return (
    <>
      <Breadcrumbs items={[{ label: NAV.learn.label, to: NAV.learn.path }]} />
      <PageHeader
        title={module.title}
        description={module.summary}
        actions={
          firstLesson && <Button to={lessonPath(module.id, firstLesson.id)}>Start the first lesson</Button>
        }
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
