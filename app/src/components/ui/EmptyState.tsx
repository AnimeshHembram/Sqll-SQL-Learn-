import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title: string
  /** What will appear here, or what to do next. */
  children: ReactNode
  action?: ReactNode
}

/**
 * Placeholder for content that does not exist yet.
 * Styled like an empty result set: a dashed outline where rows will appear.
 */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      <p className={styles.text}>{children}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
