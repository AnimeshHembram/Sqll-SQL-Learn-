import type { Feedback, FeedbackKind } from '../../features/challenges/evaluate.ts'
import styles from './FeedbackPanel.module.css'

/** A short label for each kind of feedback, shown above the verdict. */
const LABELS: Record<FeedbackKind, string> = {
  correct: 'Correct',
  'incorrect-output': 'Incorrect output',
  'syntax-error': 'Syntax error',
  'missing-rows': 'Missing rows',
  'extra-rows': 'Extra rows',
  'wrong-order': 'Wrong order',
  'column-mismatch': 'Column mismatch',
  'execution-failure': 'Could not run',
}

/** The verdict on a submission. The label is text, so the outcome never relies on colour alone. */
export function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  const correct = feedback.kind === 'correct'
  return (
    <div className={correct ? styles.correct : styles.incorrect} data-feedback={feedback.kind}>
      <p className={styles.label}>
        <span aria-hidden="true">{correct ? '✓ ' : '✗ '}</span>
        {LABELS[feedback.kind]}
      </p>
      <p className={styles.title}>{feedback.title}</p>
      <ul className={styles.details}>
        {feedback.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </div>
  )
}
