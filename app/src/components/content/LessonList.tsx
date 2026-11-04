import { Link } from 'react-router'
import { lessonPath, type ContentModule } from '../../content/index.ts'
import { useProgress } from '../../features/progress/progressStore.ts'
import { isLessonComplete } from '../../features/progress/progressSummary.ts'
import styles from './LessonList.module.css'

interface LessonListProps {
  module: ContentModule
}

/** A module's lessons, in order, each linking to its page. Completed lessons are ticked. */
export function LessonList({ module }: LessonListProps) {
  const progress = useProgress()

  return (
    <ol className={styles.list}>
      {module.lessons.map((lesson) => {
        const completed = isLessonComplete(progress, module.id, lesson.id)
        return (
          <li key={lesson.id} className={styles.item} data-completed={completed || undefined}>
            <div className={styles.text}>
              <Link to={lessonPath(module.id, lesson.id)} className={styles.link}>
                {lesson.title}
              </Link>
              {completed && <span className="visually-hidden"> (completed)</span>}
              <p className={styles.summary}>{lesson.summary}</p>
            </div>
            <span className={styles.duration}>{lesson.durationMinutes} min</span>
          </li>
        )
      })}
    </ol>
  )
}
