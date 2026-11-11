import type { ChapterStatus } from '../../features/paths/pathSummary.ts'
import styles from './ChapterState.module.css'

/** A short, visible label for a chapter's or project's state. Planned chapters say so plainly. */
export function ChapterState({ status }: { status: ChapterStatus }) {
  const { state, steps, kind } = status
  const text =
    state === 'planned'
      ? 'Planned'
      : state === 'complete'
        ? 'Complete'
        : state === 'in-progress'
          ? `${steps.done} of ${steps.total} ${kind === 'linked' ? 'lessons' : kind === 'project' ? 'tasks' : 'steps'} done`
          : 'Not started'
  return (
    <span className={styles.state} data-state={state}>
      {text}
    </span>
  )
}
