import { cx } from '../../lib/cx.ts'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  done: number
  total: number
  /** What is being measured, for screen readers. For example "SQL fundamentals lessons completed". */
  label: string
  className?: string
}

/** A thin bar showing how much of something is complete. */
export function ProgressBar({ done, total, label, className }: ProgressBarProps) {
  const ratio = total === 0 ? 0 : Math.min(done / total, 1)
  return (
    <div
      className={cx(styles.track, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${total}`}
    >
      <div className={cx(styles.fill, ratio === 1 && styles.complete)} style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}
