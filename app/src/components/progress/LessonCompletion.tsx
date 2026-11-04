import { useNavigate } from 'react-router'
import { lessonPath, modulePath, type LessonLocation } from '../../content/index.ts'
import { markLessonComplete, markLessonIncomplete, useProgress } from '../../features/progress/progressStore.ts'
import { lessonKey } from '../../features/progress/progressModel.ts'
import { Button } from '../ui/Button.tsx'
import { Card } from '../ui/Card.tsx'
import { CompletionBadge } from './CompletionBadge.tsx'
import { formatDate } from './format.ts'
import styles from './LessonCompletion.module.css'

interface LessonCompletionProps {
  location: LessonLocation
}

/**
 * The end-of-lesson panel: mark the lesson complete (and move on), or undo it.
 * Completion is the learner's own decision, so it is never set automatically.
 */
export function LessonCompletion({ location }: LessonCompletionProps) {
  const { module, lesson, next } = location
  const progress = useProgress()
  const navigate = useNavigate()
  const completed = progress.lessons[lessonKey(module.id, lesson.id)]

  const completeAndContinue = () => {
    markLessonComplete(module.id, lesson.id)
    void navigate(next ? lessonPath(module.id, next.id) : modulePath(module.id))
  }

  return (
    <Card title={completed ? 'Lesson complete' : 'Finished this lesson?'} className={styles.card}>
      <div role="status" className={styles.status}>
        {completed ? (
          <p className={styles.done}>
            <CompletionBadge label="Completed" />
            <span>You completed this lesson on {formatDate(completed.completedAt)}.</span>
          </p>
        ) : (
          <p>Mark it as complete when you are comfortable with it. Your progress is saved in this browser only.</p>
        )}
      </div>
      <div className={styles.actions}>
        {completed ? (
          <>
            {next && <Button to={lessonPath(module.id, next.id)}>Next lesson: {next.title}</Button>}
            <Button variant="secondary" onClick={() => markLessonIncomplete(module.id, lesson.id)}>
              Mark as not complete
            </Button>
          </>
        ) : (
          <>
            <Button onClick={completeAndContinue}>{next ? 'Complete and continue' : 'Complete the module'}</Button>
            <Button variant="secondary" onClick={() => markLessonComplete(module.id, lesson.id)}>
              Mark as complete
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
