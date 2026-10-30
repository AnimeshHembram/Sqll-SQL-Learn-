import { useEffect } from 'react'
import { useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonPager } from '../components/content/LessonPager.tsx'
import { Prose } from '../components/content/Prose.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { findLesson, formatLevel, modulePath } from '../content/index.ts'
import { rememberLastLesson } from '../content/lastLesson.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './LessonPage.module.css'

export function LessonPage() {
  const { moduleId = '', lessonId = '' } = useParams()
  const location = findLesson(moduleId, lessonId)
  const exists = location !== undefined

  // Remember this lesson so the dashboard can offer "Continue learning".
  useEffect(() => {
    if (exists) rememberLastLesson(moduleId, lessonId)
  }, [exists, moduleId, lessonId])

  if (!location) return <NotFoundPage />

  const { module, lesson, index } = location

  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.learn.label, to: NAV.learn.path },
          { label: module.title, to: modulePath(module.id) },
        ]}
      />
      <PageHeader
        title={lesson.title}
        description={lesson.summary}
        meta={`Lesson ${index + 1} of ${module.lessons.length}. About ${lesson.durationMinutes} minutes. ${formatLevel(lesson.level)} level.`}
      />

      <Card title="In this lesson you will" className={styles.objectives}>
        <ul className={styles.objectiveList}>
          {lesson.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </Card>

      <article aria-label={lesson.title}>
        <Prose html={lesson.html} />
      </article>

      <LessonPager location={location} />
    </>
  )
}
