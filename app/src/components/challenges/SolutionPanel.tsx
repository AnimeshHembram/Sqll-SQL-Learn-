import { useEffect, useRef, useState } from 'react'
import { loadSolution, type ChallengeSolution } from '../../content/challenges.ts'
import { Prose } from '../content/Prose.tsx'
import { ResultTable } from '../sql/ResultTable.tsx'
import { Button } from '../ui/Button.tsx'
import { Card } from '../ui/Card.tsx'
import { useFocusWhenDone } from '../../lib/useFocusReturn.ts'
import styles from './SolutionPanel.module.css'

interface SolutionPanelProps {
  challengeId: string
  /** True after a submission or after every hint, so the solution is not one click away from the start. */
  unlocked: boolean
  revealed: boolean
  solved: boolean
  onReveal: () => void
  /** Heading level of the "Solution" title: 2 on its own page, deeper inside an exercise. Subheadings sit one level below. */
  headingLevel?: 2 | 3 | 4
}

type LoadState = { status: 'loading' } | { status: 'loaded'; solution: ChallengeSolution } | { status: 'failed' }

/**
 * The reference solution, its result and an explanation. Nothing is downloaded
 * until the learner chooses to see it.
 */
export function SolutionPanel({ challengeId, unlocked, revealed, solved, onReveal, headingLevel = 2 }: SolutionPanelProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const solutionRef = useRef<HTMLDivElement>(null)
  // "Show the solution" is replaced by the solution itself; keyboard users continue from there.
  useFocusWhenDone(revealed, solutionRef)

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
      <Card title="Solution" headingLevel={headingLevel}>
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
    <Card title="Solution" headingLevel={headingLevel}>
      <div aria-live="polite" ref={solutionRef} tabIndex={-1}>
        {state.status === 'loading' && <p className={styles.note}>Loading the solution…</p>}
        {state.status === 'failed' && <p className={styles.problem}>The solution could not be loaded. Check your connection and reload the page.</p>}
        {state.status === 'loaded' && <SolutionDetails solution={state.solution} level={headingLevel + 1} />}
      </div>
    </Card>
  )
}

function SolutionDetails({ solution, level }: { solution: ChallengeSolution; level: number }) {
  const Sub = `h${level}` as 'h3' | 'h4' | 'h5'
  return (
    <div className={styles.solution}>
      <Sub className={styles.subheading}>Reference query</Sub>
      <pre className={styles.code}><code>{solution.sql.trim()}</code></pre>

      <Sub className={styles.subheading}>Expected result</Sub>
      <ResultTable
        columns={solution.expected.columns}
        rows={solution.expected.rows.map((row) => row.map((cell) => (cell === 'NULL' ? null : cell)))}
        label="Expected result"
      />
      <p className={styles.note}>
        {solution.evaluation.orderMatters ? 'Rows must appear in this order.' : 'Rows may appear in any order.'}
      </p>

      <Sub className={styles.subheading}>Why it works</Sub>
      <Prose html={solution.explanationHtml} />

      {solution.alternatives.length > 0 && (
        <>
          <Sub className={styles.subheading}>{solution.alternatives.length === 1 ? 'Another correct answer' : 'Other correct answers'}</Sub>
          {solution.alternatives.map((sql) => (
            <pre key={sql} className={styles.code}><code>{sql.trim()}</code></pre>
          ))}
        </>
      )}
    </div>
  )
}
