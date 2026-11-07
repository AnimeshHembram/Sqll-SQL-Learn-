import { useCallback, useRef, useState } from 'react'
import type { PathExercise } from '../../content/types.ts'
import { updateChallengeSession, useChallengeSession } from '../../features/challenges/challengeSession.ts'
import type { Feedback } from '../../features/challenges/evaluate.ts'
import type { PathExerciseProgress } from '../../features/paths/pathModel.ts'
import {
  recordPathExerciseHints,
  recordPathExerciseSolutionRevealed,
  recordPathExerciseSubmission,
} from '../../features/paths/pathStore.ts'
import type { ExecuteResult } from '../../features/sql/protocol.ts'
import { challengeEngine, QUERY_TIME_LIMIT_MS } from '../../features/sql/sqlEngine.ts'
import { useFocusReturn } from '../../lib/useFocusReturn.ts'
import { FeedbackPanel } from '../challenges/FeedbackPanel.tsx'
import { HintList } from '../challenges/HintList.tsx'
import { SolutionPanel } from '../challenges/SolutionPanel.tsx'
import { Prose } from '../content/Prose.tsx'
import { CompletionBadge } from '../progress/CompletionBadge.tsx'
import { QueryResults } from '../sql/QueryResults.tsx'
import { SqlEditor, type SqlEditorHandle } from '../sql/SqlEditor.tsx'
import { Button } from '../ui/Button.tsx'
import styles from './ExerciseCard.module.css'

type Outcome =
  | { kind: 'run'; result: ExecuteResult }
  | { kind: 'submission'; feedback: Feedback; result: ExecuteResult }
  | { kind: 'engine-error'; text: string }
  | { kind: 'message'; text: string }

interface ExerciseCardProps {
  exercise: PathExercise
  /** "Guided exercise 1", "Independent exercise 2". */
  label: string
  saved: PathExerciseProgress | undefined
  /** Column names per table, for autocompletion. */
  schema: Record<string, string[]>
  engineFailed: boolean
}

/**
 * One chapter exercise. Submissions are checked by the database worker exactly
 * like challenges (against the reference query, never shown until asked for),
 * and the result is saved in the exercise's own path record.
 */
export function ExerciseCard({ exercise, label, saved, schema, engineFailed }: ExerciseCardProps) {
  const session = useChallengeSession(exercise.id)
  const sql = session.draft ?? exercise.starterSql
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null)
  const latest = useRef(0)
  const submitRef = useRef<HTMLButtonElement>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const lastActionRef = useRef<HTMLButtonElement | null>(null)
  const stopFocus = useFocusReturn(busy !== null, lastActionRef)
  const editorRef = useRef<SqlEditorHandle>(null)
  const solvedBefore = Boolean(saved?.solvedAt)

  const setSql = useCallback(
    (value: string) => updateChallengeSession(exercise.id, () => ({ draft: value === exercise.starterSql ? null : value })),
    [exercise.id, exercise.starterSql],
  )

  const perform = async (mode: 'run' | 'submit') => {
    if (busy) return
    if (sql.trim() === '') {
      setOutcome({ kind: 'message', text: 'Nothing to run yet. Write a query in the editor first.' })
      return
    }
    const requestId = ++latest.current
    lastActionRef.current = mode === 'run' ? runRef.current : submitRef.current
    setBusy(mode)
    try {
      if (mode === 'run') {
        const result = await challengeEngine.runScratch(sql)
        if (requestId === latest.current) setOutcome({ kind: 'run', result })
      } else {
        const { feedback, result } = await challengeEngine.evaluate(exercise.id, sql)
        if (requestId !== latest.current) return
        updateChallengeSession(exercise.id, (current) => ({
          submissions: current.submissions + 1,
          solved: current.solved || feedback.kind === 'correct',
        }))
        recordPathExerciseSubmission(exercise.pathId, exercise.id, feedback.kind === 'correct')
        setOutcome({ kind: 'submission', feedback, result })
      }
    } catch (error) {
      if (requestId === latest.current) setOutcome({ kind: 'engine-error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      if (requestId === latest.current) setBusy(null)
    }
  }

  const resetQuery = () => {
    updateChallengeSession(exercise.id, () => ({ draft: null }))
    setOutcome(null)
    editorRef.current?.focus()
  }

  const headingId = `exercise-${exercise.id}`

  return (
    <section className={styles.exercise} aria-labelledby={headingId} data-exercise={exercise.id}>
      <div className={styles.head}>
        <h3 id={headingId} className={styles.title}>
          <span className={styles.label}>{label}</span> {exercise.title}
        </h3>
        {solvedBefore && <CompletionBadge label="Solved" />}
      </div>
      <Prose html={exercise.descriptionHtml} />
      <p className={styles.rules}>
        Tables: {exercise.tables.join(', ')}. {exercise.evaluation.orderMatters ? 'Row order must match the task.' : 'Any row order is accepted.'}{' '}
        {exercise.evaluation.checkColumnNames ? 'Column names must match the task.' : 'Any column names are accepted.'}
      </p>

      <SqlEditor
        ref={editorRef}
        value={sql}
        onChange={setSql}
        onRun={() => void perform('run')}
        label={`Your query for ${exercise.title}`}
        schema={schema}
      />
      <div className={styles.toolbar}>
        <div className={styles.actions}>
          <Button
            ref={submitRef}
            onClick={() => void perform('submit')}
            busy={busy === 'submit'}
            disabled={busy === 'run' || engineFailed || sql.trim() === ''}
          >
            {busy === 'submit' ? 'Checking…' : 'Submit answer'}
          </Button>
          <Button
            ref={runRef}
            variant="secondary"
            onClick={() => void perform('run')}
            busy={busy === 'run'}
            disabled={busy === 'submit' || engineFailed || sql.trim() === ''}
          >
            {busy === 'run' ? 'Running…' : 'Run query'}
          </Button>
          {busy && (
            <Button variant="secondary" onClick={() => challengeEngine.stop()} {...stopFocus}>
              Stop
            </Button>
          )}
        </div>
        <Button variant="secondary" onClick={resetQuery} disabled={busy !== null || session.draft === null}>
          Reset query
        </Button>
      </div>
      <p className={styles.help}>
        <strong>Run query</strong> shows your result without checking it. <strong>Submit answer</strong> checks it against the
        expected result. Queries that take longer than {QUERY_TIME_LIMIT_MS / 1000} seconds are stopped.
      </p>

      <div aria-live="polite" className={styles.outcome}>
        <OutcomeView outcome={outcome} busy={busy} />
      </div>

      <HintList
        hints={exercise.hints}
        shown={session.hintsShown}
        onShowNext={() => {
          const hintsShown = Math.min(session.hintsShown + 1, exercise.hints.length)
          updateChallengeSession(exercise.id, () => ({ hintsShown }))
          recordPathExerciseHints(exercise.pathId, exercise.id, hintsShown)
        }}
      />
      <SolutionPanel
        challengeId={exercise.id}
        unlocked={solvedBefore || session.submissions > 0 || session.hintsShown >= exercise.hints.length}
        revealed={session.revealed}
        solved={session.solved || solvedBefore}
        onReveal={() => {
          updateChallengeSession(exercise.id, () => ({ revealed: true }))
          recordPathExerciseSolutionRevealed(exercise.pathId, exercise.id)
        }}
      />
    </section>
  )
}

function OutcomeView({ outcome, busy }: { outcome: Outcome | null; busy: 'run' | 'submit' | null }) {
  if (busy === 'submit') return <p className={styles.status}>Checking your answer…</p>
  if (busy === 'run') return <p className={styles.status}>Running your query…</p>
  if (!outcome) return null
  if (outcome.kind === 'message') return <p className={styles.status}>{outcome.text}</p>
  if (outcome.kind === 'engine-error') {
    return (
      <p className={styles.failure} role="alert">
        {outcome.text}
      </p>
    )
  }
  if (outcome.kind === 'run') {
    return (
      <>
        <p className={styles.status}>This run was not checked. Submit your answer when you are ready.</p>
        <QueryResults result={outcome.result} />
      </>
    )
  }
  return (
    <>
      <FeedbackPanel feedback={outcome.feedback} />
      {!outcome.result.error && outcome.result.statements.length > 0 && <QueryResults result={outcome.result} />}
    </>
  )
}
