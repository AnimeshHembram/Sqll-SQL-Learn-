import { Link } from 'react-router'
import { pathUrl, type CareerPath } from '../../content/paths/catalog.ts'
import { pathChapterCount } from '../../features/paths/pathSummary.ts'
import type { ProgressData } from '../../features/progress/progressModel.ts'
import { ProgressBar } from '../ui/ProgressBar.tsx'
import styles from './PathCard.module.css'

interface PathCardProps {
  path: CareerPath
  progress: ProgressData
  /** True for the path the learner is following. */
  current: boolean
  /** True once the learner has chosen this path at least once. */
  started: boolean
}

/** One career path on the SQL Path page: what it is, how much exists, and how far the learner is. */
export function PathCard({ path, progress, current, started }: PathCardProps) {
  const chapters = pathChapterCount(path, progress)
  return (
    <article className={styles.card} data-current={current || undefined}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          <Link to={pathUrl(path.id)} className={styles.link}>
            {path.title}
          </Link>
        </h3>
        {current && <span className={styles.current}>Current path</span>}
      </div>
      <p className={styles.tagline}>{path.tagline}</p>
      <p className={styles.meta}>
        {path.stages.length} stages · {chapters.total} chapters ready · {chapters.planned} planned
      </p>
      {started || chapters.done > 0 ? (
        <div className={styles.progress}>
          <p className={styles.progressText}>
            {chapters.done} of {chapters.total} ready chapters complete
          </p>
          <ProgressBar done={chapters.done} total={chapters.total} label={`${path.title} ready chapters complete`} />
        </div>
      ) : null}
    </article>
  )
}
