import { recentDays } from '../../features/progress/progressModel.ts'
import { plural } from './format.ts'
import styles from './ActivityStrip.module.css'

interface ActivityStripProps {
  activity: Record<string, number>
  now: Date
  /** How many days to show, ending today. */
  days?: number
}

function level(count: number): number {
  if (count === 0) return 0
  if (count < 3) return 1
  if (count < 8) return 2
  return 3
}

/**
 * The last few weeks as a row of squares, darker on busier days. The squares
 * are decorative; screen readers get a one-sentence summary instead.
 */
export function ActivityStrip({ activity, now, days = 28 }: ActivityStripProps) {
  const cells = recentDays(activity, now, days)
  const activeCount = cells.filter((cell) => cell.count > 0).length

  return (
    <figure className={styles.figure}>
      <div className={styles.strip} aria-hidden="true">
        {cells.map((cell) => (
          <span
            key={cell.day}
            className={styles.cell}
            data-level={level(cell.count)}
            title={`${cell.day}: ${cell.count === 0 ? 'no activity' : plural(cell.count, 'learning action')}`}
          />
        ))}
      </div>
      <figcaption className={styles.caption}>
        Active on {activeCount} of the last {days} days
      </figcaption>
    </figure>
  )
}
