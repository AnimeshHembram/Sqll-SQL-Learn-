import { Icon } from '../ui/Icon.tsx'
import styles from './CompletionBadge.module.css'

interface CompletionBadgeProps {
  /** For example "Completed" or "Solved". */
  label: string
}

/** A small green marker for finished lessons, solved challenges and finished quizzes. */
export function CompletionBadge({ label }: CompletionBadgeProps) {
  return (
    <span className={styles.badge}>
      <Icon name="check" size={14} />
      {label}
    </span>
  )
}
