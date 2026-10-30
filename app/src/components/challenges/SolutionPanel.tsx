import { useEffect, useState } from 'react'
import { loadSolution, type ChallengeSolution } from '../../content/challenges.ts'
import { Prose } from '../content/Prose.tsx'
import { ResultTable } from '../sql/ResultTable.tsx'
import { Button } from '../ui/Button.tsx'
import { Card } from '../ui/Card.tsx'
import styles from './SolutionPanel.module.css'

interface SolutionPanelProps {
  challengeId: string
  /** True after a submission or after every hint, so the solution is not one click away from the start. */
  unlocked: boolean
  revealed: boolean
  solved: boolean
  onReveal: () => void
}

type LoadState = { status: 'loading' } | { status: 'loaded'; solution: ChallengeSolution } | { status: 'failed' }

/**
 * The reference solution, its result and an explanation. Nothing is downloaded
 * until the learner chooses to see it.
 */
export function SolutionPanel({ challengeId, unlocked, revealed, solved, onReveal }: SolutionPanelProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!revealed) return
    let cancelled = false
    loadSolution(challengeId).then(
      (solution) => {
        if (!cancelled) setState(solution ? { status: 'loaded', solution } : { status: 'failed' })
      },
      () => {
        if (!cancelled) setState({ status: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [challengeId, revealed])

  if (!revealed) {
    return (
      <Card title="Solution">
        <p className={styles.note}>
          {solved
            ? 'You solved it. Compare your query with the reference solution and read why it works.'
            : unlocked
              ? 'Try the hints first if you have not, then look at the solution when you are ready.'
              : 'The solution becomes available after you submit an answer or use every hint.'}
        </p>
        <Button variant="secondary" onClick={onReveal} disabled={!unlocked}>
          {solved ? 'Compare with the solution' : 'Show the solution'}
        </Button>
      </Card>
    )
  }

  return (
    <Card title="Solution">
      <div aria-live="polite">
        {state.status === 'loading' && <p className={styles.note}>Loading the solution…</p>}
        {state.status === 'failed' && <p className={styles.problem}>The solution could not be loaded. Check your connection and reload the page.</p>}
        {state.status === 'loaded' && <SolutionDetails solution={state.solution} />}
      </div>
    </Card>
  )
}

function SolutionDetails({ solution }: { solution: ChallengeSolution }) {
  return (
    <div className={styles.solution}>
      <h3 className={styles.subheading}>Reference query</h3>
      <pre className={styles.code}><code>{solution.sql.trim()}</code></pre>

      <h3 className={styles.subheading}>Expected result</h3>
      <ResultTable
        columns={solution.expected.columns}
        rows={solution.expected.rows.map((row) => row.map((cell) => (cell === 'NULL' ? null : cell)))}
        label="Expected result"
      />
      <p className={styles.note}>
        {solution.evaluation.orderMatters ? 'Rows must appear in this order.' : 'Rows may appear in any order.'}
      </p>

      <h3 className={styles.subheading}>Why it works</h3>
      <Prose html={solution.explanationHtml} />

      {solution.alternatives.length > 0 && (
        <>
          <h3 className={styles.subheading}>{solution.alternatives.length === 1 ? 'Another correct answer' : 'Other correct answers'}</h3>
          {solution.alternatives.map((sql) => (
            <pre key={sql} className={styles.code}><code>{sql.trim()}</code></pre>
          ))}
        </>
      )}
    </div>
  )
}
