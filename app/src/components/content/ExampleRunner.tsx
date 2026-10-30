import { useState } from 'react'
import { useNavigate } from 'react-router'
import { NAV } from '../../app/navigation.ts'
import type { LessonExample } from '../../content/types.ts'
import { compareTables } from '../../features/sql/compare.ts'
import type { ExecuteResult } from '../../features/sql/protocol.ts'
import { sqlEngine } from '../../features/sql/sqlEngine.ts'
import { describeStatement } from '../../features/sql/statements.ts'
import type { PracticeLocationState } from '../../pages/PracticePage.tsx'
import { ResultTable } from '../sql/ResultTable.tsx'
import styles from './ExampleRunner.module.css'

interface ExampleRunnerProps {
  example: LessonExample
  /** One-based position in the lesson, for accessible names. */
  number: number
}

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: ExecuteResult }
  | { status: 'failed'; message: string }

/**
 * Run and Open in Practice controls under a lesson example. Runs use a fresh copy
 * of the sample database, so they always match the lesson regardless of changes
 * made in the practice space.
 */
export function ExampleRunner({ example, number }: ExampleRunnerProps) {
  const navigate = useNavigate()
  const [state, setState] = useState<RunState>({ status: 'idle' })

  const run = async () => {
    setState({ status: 'running' })
    try {
      setState({ status: 'done', result: await sqlEngine.runScratch(example.sql) })
    } catch (error) {
      setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  const openInPractice = () => {
    void navigate(NAV.practice.path, { state: { sql: example.sql.trim() } satisfies PracticeLocationState })
  }

  return (
    <div className={styles.runner}>
      <div className={styles.actions}>
        {/* The hidden suffix keeps the visible words at the start of the accessible name (WCAG 2.5.3). */}
        <button type="button" className={styles.run} onClick={() => void run()} disabled={state.status === 'running'}>
          {state.status === 'running' ? 'Running…' : state.status === 'idle' ? 'Run' : 'Run again'}
          <span className="visually-hidden"> (example {number})</span>
        </button>
        <button type="button" className={styles.open} onClick={openInPractice}>
          Open in Practice<span className="visually-hidden"> (example {number})</span>
        </button>
      </div>
      <div aria-live="polite">{state.status !== 'idle' && state.status !== 'running' && <Outcome example={example} state={state} />}</div>
    </div>
  )
}

function Outcome({ example, state }: { example: LessonExample; state: Exclude<RunState, { status: 'idle' | 'running' }> }) {
  if (state.status === 'failed') {
    return <p className={styles.problem}>{state.message}</p>
  }

  const { statements, error } = state.result

  if (example.kind === 'error') {
    return error ? (
      <div className={styles.outcome}>
        <p className={styles.expectedError}>
          SQLite reports: <code>{error.message}</code>
        </p>
        <p className={styles.note}>This query fails, as the lesson explains.</p>
      </div>
    ) : (
      <p className={styles.problem}>This query ran without an error.</p>
    )
  }

  if (error) {
    return (
      <p className={styles.problem}>
        The query failed: <code>{error.message}</code>
      </p>
    )
  }

  const last = statements.at(-1)
  if (!last) return <p className={styles.note}>Nothing ran.</p>
  if (last.columns.length === 0) return <p className={styles.note}>{describeStatement(last)}</p>

  const comparison = example.expected ? compareTables(example.expected, last) : null

  return (
    <div className={styles.outcome}>
      <p className={styles.caption}>Actual result from SQLite</p>
      {last.rows.length > 0 ? (
        <ResultTable columns={last.columns} rows={last.rows} label="Actual result" />
      ) : (
        <p className={styles.note}>No rows returned.</p>
      )}
      {comparison &&
        (comparison.matches ? (
          <p className={styles.match}>Matches the expected output shown below.</p>
        ) : (
          <div className={styles.problem}>
            <p>Differs from the expected output shown below:</p>
            <ul>
              {comparison.differences.map((difference) => (
                <li key={difference}>{difference}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}
