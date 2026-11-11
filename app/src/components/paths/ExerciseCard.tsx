import { useCallback, useRef, useState } from 'react'
import type { ContentChallenge, ExpectedShape } from '../../content/types.ts'
import { updateChallengeSession, useChallengeSession } from '../../features/challenges/challengeSession.ts'
import type { Feedback } from '../../features/challenges/evaluate.ts'
import { saveDraft, savedDraft } from '../../features/paths/pathDrafts.ts'
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

/** Where the card saves what the learner does. Chapter exercises and daily problems save to different parts of the path record. */
export interface ExerciseRecorder {
  submitted: (correct: boolean) => void
  hintsShown: (count: number) => void
  solutionRevealed: () => void
}

interface ExerciseCardProps {
  exercise: ContentChallenge & { pathId: string }
  /** "Guided exercise 1", "Independent exercise 2", "Day 7". */
  label: string
  /** What the path record holds for this exercise: restores hints and the revealed solution after a reload. */
  saved: { solvedAt: string | null; attempts?: number; hintsUsed?: number; revealedSolution?: boolean } | undefined
  /** Defaults to saving as a chapter exercise in the path record. */
  recorder?: ExerciseRecorder
  /** Column names per table, for autocompletion. */
  schema: Record<string, string[]>
  engineFailed: boolean
  /** Heading level of the exercise title: 3 under a section heading (chapters), 2 directly under the page title (daily problems). */
  headingLevel?: 2 | 3
  /** The expected result's shape (daily problems), shown under the task. */
  expected?: ExpectedShape
}

/**
 * One chapter exercise. Submissions are checked by the database worker exactly
 * like challenges (against the reference query, never shown until asked for),
 * and the result is saved in the exercise's own path record.
 */
export function ExerciseCard({ exercise, label, saved, recorder, schema, engineFailed, headingLevel = 3, expected }: ExerciseCardProps) {
  const save: ExerciseRecorder = recorder ?? {
    submitted: (correct) => recordPathExerciseSubmission(exercise.pathId, exercise.id, correct),
    hintsShown: (count) => recordPathExerciseHints(exercise.pathId, exercise.id, count),
    solutionRevealed: () => recordPathExerciseSolutionRevealed(exercise.pathId, exercise.id),
  }
  const session = useChallengeSession(exercise.id)
  // This visit's state comes first; otherwise what was saved earlier: the draft in this browser, hints and the solution in the path record.
  const sql = session.draft ?? savedDraft(exercise.id) ?? exercise.starterSql
  const hintsShown = Math.min(Math.max(session.hintsShown, saved?.hintsUsed ?? 0), exercise.hints.length)
  const revealed = session.revealed || Boolean(saved?.revealedSolution)
  const Heading = `h${headingLevel}` as const
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
    (value: string) => {
      const draft = value === exercise.starterSql ? null : value
      updateChallengeSession(exercise.id, () => ({ draft }))
      saveDraft(exercise.id, draft)
    },
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
        save.submitted(feedback.kind === 'correct')
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
    saveDraft(exercise.id, null)
    setOutcome(null)
    editorRef.current?.focus()
  }

  const headingId = `exercise-${exercise.id}`

  return (
    <section className={styles.exercise} aria-labelledby={headingId} data-exercise={exercise.id}>
      <div className={styles.head}>
        <Heading id={headingId} className={styles.title}>
          <span className={styles.label}>{label}</span> {exercise.title}
        </Heading>
        {solvedBefore && <CompletionBadge label="Solved" />}
      </div>
      <Prose html={exercise.descriptionHtml} />
      <p className={styles.rules}>
        {exercise.tables.length > 0 ? `Tables: ${exercise.tables.join(', ')}.` : 'The data for this task is written in the starter query.'}{' '}
        {exercise.evaluation.orderMatters ? 'Row order must match the task.' : 'Any row order is accepted.'}{' '}
        {exercise.evaluation.checkColumnNames ? 'Column names must match the task.' : 'Any column names are accepted.'}
      </p>
      {expected && <ExpectedOutput expected={expected} checkColumnNames={exercise.evaluation.checkColumnNames} />}

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
        <Button variant="secondary" onClick={resetQuery} disabled={busy !== null || sql === exercise.starterSql}>
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
        shown={hintsShown}
        headingLevel={headingLevel === 2 ? 3 : 4}
        onShowNext={() => {
          const next = Math.min(hintsShown + 1, exercise.hints.length)
          updateChallengeSession(exercise.id, () => ({ hintsShown: next }))
          save.hintsShown(next)
        }}
      />
      <SolutionPanel
        challengeId={exercise.id}
        unlocked={solvedBefore || session.submissions > 0 || (saved?.attempts ?? 0) > 0 || hintsShown >= exercise.hints.length}
        revealed={revealed}
        headingLevel={headingLevel === 2 ? 3 : 4}
        solved={session.solved || solvedBefore}
        onReveal={() => {
          updateChallengeSession(exercise.id, () => ({ revealed: true }))
          save.solutionRevealed()
        }}
      />
    </section>
  )
}

/** "Expected output: 2 rows with the columns title, genre and price." Shape only: the values stay hidden until the solution is shown. */
function ExpectedOutput({ expected, checkColumnNames }: { expected: ExpectedShape; checkColumnNames: boolean }) {
  const rows = `${expected.rowCount} ${expected.rowCount === 1 ? 'row' : 'rows'}`
  const count = expected.columns.length
  return (
    <p className={styles.rules} data-expected-output>
      <strong>Expected output:</strong> {rows}{' '}
      {checkColumnNames ? (
        <>
          with the {count === 1 ? 'column' : 'columns'}{' '}
          {expected.columns.map((column, index) => (
            <span key={column + index}>
              {index > 0 && (index === count - 1 ? ' and ' : ', ')}
              <code>{column}</code>
            </span>
          ))}
          , in this order.
        </>
      ) : (
        <>
          and {count} {count === 1 ? 'column' : 'columns'} (any column names).
        </>
      )}
    </p>
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
