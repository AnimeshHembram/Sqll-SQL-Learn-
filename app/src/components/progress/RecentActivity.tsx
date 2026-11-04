import { Link } from 'react-router'
import { challengePath, findChallenge, findQuiz, quizPath } from '../../content/challenges.ts'
import { findLesson, lessonPath } from '../../content/index.ts'
import type { RecentEvent } from '../../features/progress/progressModel.ts'
import { EmptyState } from '../ui/EmptyState.tsx'
import { formatRelativeDay } from './format.ts'
import styles from './RecentActivity.module.css'

interface RecentActivityProps {
  events: readonly RecentEvent[]
  now: Date
  /** How many events to show. */
  limit?: number
}

interface Row {
  key: string
  action: string
  title: string
  to: string
  at: string
}

/** Turns a saved event into a row, or null if its lesson, challenge or quiz no longer exists. */
function describe(event: RecentEvent): Row | null {
  const key = `${event.kind}:${event.id}`
  if (event.kind === 'lesson') {
    const [moduleId = '', lessonId = ''] = event.id.split('/')
    const location = findLesson(moduleId, lessonId)
    return location
      ? { key, action: 'Completed lesson', title: location.lesson.title, to: lessonPath(moduleId, lessonId), at: event.at }
      : null
  }
  if (event.kind === 'challenge') {
    const location = findChallenge(event.id)
    return location
      ? { key, action: 'Solved challenge', title: location.challenge.title, to: challengePath(event.id), at: event.at }
      : null
  }
  const quiz = findQuiz(event.id)
  return quiz
    ? {
        key,
        action: event.detail ? `Scored ${event.detail} in quiz` : 'Finished quiz',
        title: quiz.title,
        to: quizPath(event.id),
        at: event.at,
      }
    : null
}

/** Lessons completed, challenges solved and quizzes finished, newest first. */
export function RecentActivity({ events, now, limit = 5 }: RecentActivityProps) {
  const rows = events.map(describe).filter((row): row is Row => row !== null).slice(0, limit)

  if (rows.length === 0) {
    return (
      <EmptyState title="No activity yet">
        Lessons you complete, challenges you solve and quizzes you finish will be listed here.
      </EmptyState>
    )
  }

  return (
    <ol className={styles.list}>
      {rows.map((row) => (
        <li key={row.key} className={styles.item}>
          <span className={styles.action}>{row.action}</span>
          <Link to={row.to} className={styles.link}>
            {row.title}
          </Link>
          <time dateTime={row.at} className={styles.when}>
            {formatRelativeDay(row.at, now)}
          </time>
        </li>
      ))}
    </ol>
  )
}
