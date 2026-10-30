import { Link } from 'react-router'
import { lessonPath, type ContentModule } from '../../content/index.ts'
import styles from './LessonList.module.css'

interface LessonListProps {
  module: ContentModule
}

/** A module's lessons, in order, each linking to its page. */
export function LessonList({ module }: LessonListProps) {
  return (
    <ol className={styles.list}>
      {module.lessons.map((lesson) => (
        <li key={lesson.id} className={styles.item}>
          <div className={styles.text}>
            <Link to={lessonPath(module.id, lesson.id)} className={styles.link}>
              {lesson.title}
            </Link>
            <p className={styles.summary}>{lesson.summary}</p>
          </div>
          <span className={styles.duration}>{lesson.durationMinutes} min</span>
        </li>
      ))}
    </ol>
  )
}
