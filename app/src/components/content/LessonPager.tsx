import { Link } from 'react-router'
import { lessonPath, modulePath, type LessonLocation } from '../../content/index.ts'
import { cx } from '../../lib/cx.ts'
import styles from './LessonPager.module.css'

interface LessonPagerProps {
  location: LessonLocation
}

/** Previous and next lesson links at the end of a lesson. */
export function LessonPager({ location }: LessonPagerProps) {
  const { module, previous, next } = location

  return (
    <nav aria-label="Lesson navigation" className={styles.pager}>
      {previous ? (
        <Link to={lessonPath(module.id, previous.id)} className={styles.link}>
          <span className={styles.label}>Previous lesson</span>
          <span className={styles.title}>{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={lessonPath(module.id, next.id)} className={cx(styles.link, styles.next)}>
          <span className={styles.label}>Next lesson</span>
          <span className={styles.title}>{next.title}</span>
        </Link>
      ) : (
        <Link to={modulePath(module.id)} className={cx(styles.link, styles.next)}>
          <span className={styles.label}>End of module</span>
          <span className={styles.title}>Back to {module.title}</span>
        </Link>
      )}
    </nav>
  )
}
