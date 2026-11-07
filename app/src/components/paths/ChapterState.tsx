import type { ChapterStatus } from '../../features/paths/pathSummary.ts'
import styles from './ChapterState.module.css'

/** A short, visible label for a chapter's state. Planned chapters say so plainly. */
export function ChapterState({ status }: { status: ChapterStatus }) {
  const { state, lessons } = status
  const text =
    state === 'planned'
      ? 'Planned'
      : state === 'complete'
        ? 'Complete'
        : state === 'in-progress'
          ? `${lessons.done} of ${lessons.total} lessons done`
          : 'Not started'
  return (
    <span className={styles.state} data-state={state}>
      {text}
    </span>
  )
}
