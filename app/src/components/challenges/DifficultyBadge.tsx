import { formatLevel, type Level } from '../../content/index.ts'
import styles from './DifficultyBadge.module.css'

/** "Beginner", "Intermediate" or "Advanced", with one, two or three bars so it does not rely on colour. */
export function DifficultyBadge({ level }: { level: Level }) {
  const bars = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3
  return (
    <span className={styles.badge} data-level={level}>
      <span className={styles.bars} aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={bar <= bars ? styles.on : styles.off} />
        ))}
      </span>
      {formatLevel(level)}
    </span>
  )
}
