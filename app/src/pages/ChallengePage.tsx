import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { DifficultyBadge } from '../components/challenges/DifficultyBadge.tsx'
import { FeedbackPanel } from '../components/challenges/FeedbackPanel.tsx'
import { HintList } from '../components/challenges/HintList.tsx'
import { SolutionPanel } from '../components/challenges/SolutionPanel.tsx'
import { Tag } from '../components/challenges/Tag.tsx'
import { Prose } from '../components/content/Prose.tsx'
import { QueryResults } from '../components/sql/QueryResults.tsx'
import { SchemaExplorer } from '../components/sql/SchemaExplorer.tsx'
import { SqlEditor } from '../components/sql/SqlEditor.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { CHALLENGES, challengePath, findChallenge, type ChallengeLocation } from '../content/challenges.ts'
import { findModule, modulePath } from '../content/index.ts'
import { updateChallengeSession, useChallengeSession } from '../features/challenges/challengeSession.ts'
import type { Feedback } from '../features/challenges/evaluate.ts'
import type { ExecuteResult, TableInfo } from '../features/sql/protocol.ts'
import { challengeEngine, QUERY_TIME_LIMIT_MS } from '../features/sql/sqlEngine.ts'
import { useSqlEngine } from '../features/sql/useSqlEngine.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ChallengePage.module.css'

type Outcome =
  | { kind: 'run'; result: ExecuteResult }
  | { kind: 'submission'; feedback: Feedback; result: ExecuteResult }
  | { kind: 'engine-error'; text: string }

const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const RUN_SHORTCUT = isApple ? '⌘ + Enter' : 'Ctrl + Enter'

export function ChallengePage() {
  const { challengeId = '' } = useParams()
  const location = findChallenge(challengeId)
  if (!location) return <NotFoundPage />
  // A new key per challenge, so moving to the next challenge starts with fresh page state.
  return <ChallengeWorkspace key={location.challenge.id} location={location} />
}

function ChallengeWorkspace({ location }: { location: ChallengeLocation }) {
  const { challenge, index, previous, next } = location
  const engine = useSqlEngine(challengeEngine)
  const session = useChallengeSession(challenge.id)
  const sql = session.draft ?? challenge.starterSql
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null)
  const [allTables, setAllTables] = useState<TableInfo[] | null>(null)
  // Only the latest request may show its outcome.
  const latest = useRef(0)

  const engineUsable = engine.sqliteVersion !== null && engine.status !== 'failed'
  const module = challenge.moduleId ? findModule(challenge.moduleId) : undefined

  useEffect(() => {
    void challengeEngine.start().catch(() => {
      // Reported through engine state ("failed").
    })
  }, [])

  // The challenge engine never changes its database, so the schema is read once.
  useEffect(() => {
    if (!engineUsable || allTables) return
    let cancelled = false
    challengeEngine.schema().then(
      (result) => {
        if (!cancelled) setAllTables(result)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [engineUsable, allTables])

  const tables = useMemo(
    () => allTables && challenge.tables.flatMap((name) => allTables.filter((table) => table.name === name)),
    [allTables, challenge.tables],
  )
  const schemaForCompletion = useMemo(
    () => Object.fromEntries((tables ?? []).map((table) => [table.name, table.columns.map((column) => column.name)])),
    [tables],
  )

  // The starter query counts as "no draft", so Reset query knows when there is nothing to reset.
  const setSql = useCallback(
    (value: string) => updateChallengeSession(challenge.id, () => ({ draft: value === challenge.starterSql ? null : value })),
    [challenge.id, challenge.starterSql],
  )

  const perform = useCallback(
    async (mode: 'run' | 'submit') => {
      if (busy || sql.trim() === '') return
      const requestId = ++latest.current
      setBusy(mode)
      try {
        if (mode === 'run') {
          const result = await challengeEngine.runScratch(sql)
          if (requestId === latest.current) setOutcome({ kind: 'run', result })
        } else {
          const { feedback, result } = await challengeEngine.evaluate(challenge.id, sql)
          if (requestId !== latest.current) return
          updateChallengeSession(challenge.id, (current) => ({
            submissions: current.submissions + 1,
            solved: current.solved || feedback.kind === 'correct',
          }))
          setOutcome({ kind: 'submission', feedback, result })
        }
      } catch (error) {
        if (requestId === latest.current) {
          setOutcome({ kind: 'engine-error', text: error instanceof Error ? error.message : String(error) })
        }
      } finally {
        if (requestId === latest.current) setBusy(null)
      }
    },
    [busy, sql, challenge.id],
  )

  const resetQuery = () => {
    updateChallengeSession(challenge.id, () => ({ draft: null }))
    setOutcome(null)
  }

  const queryTable = (tableName: string) => setSql(`SELECT *\nFROM "${tableName.replaceAll('"', '""')}"\nLIMIT 10;`)

  return (
    <>
      <Breadcrumbs items={[{ label: NAV.challenges.label, to: NAV.challenges.path }]} />
      <PageHeader
        title={challenge.title}
        description={challenge.summary}
        meta={`Challenge ${index + 1} of ${CHALLENGES.length}. About ${challenge.durationMinutes} minutes.`}
      />
      <p className={styles.tags}>
        <DifficultyBadge level={challenge.difficulty} />
        <Tag>
          <span className="visually-hidden">Topic: </span>
          {challenge.topic}
        </Tag>
      </p>

      <div className={styles.layout}>
        <div className={styles.main}>
          <Card title="Task">
            <Prose html={challenge.descriptionHtml} />
            <dl className={styles.rules}>
              <div>
                <dt>Row order</dt>
                <dd>{challenge.evaluation.orderMatters ? 'Must match the order the task asks for' : 'Any order is accepted'}</dd>
              </div>
              <div>
                <dt>Column names</dt>
                <dd>{challenge.evaluation.checkColumnNames ? 'Must match the task (capitals do not matter)' : 'Any names are accepted'}</dd>
              </div>
            </dl>
            <div className={styles.details}>
              <div>
                <h3 className={styles.subheading}>You will</h3>
                <ul className={styles.bullets}>
                  {challenge.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
              {(challenge.prerequisites.length > 0 || module) && (
                <div>
                  <h3 className={styles.subheading}>Before you start</h3>
                  <ul className={styles.bullets}>
                    {challenge.prerequisites.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    {module && (
                      <li>
                        Covered in the module <Link to={modulePath(module.id)}>{module.title}</Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <Card title="Your query">
            <SqlEditor value={sql} onChange={setSql} onRun={() => void perform('run')} label="Your SQL query" schema={schemaForCompletion} />
            <div className={styles.toolbar}>
              <div className={styles.actions}>
                <Button onClick={() => void perform('submit')} disabled={busy !== null || engine.status === 'failed' || sql.trim() === ''}>
                  {busy === 'submit' ? 'Checking…' : 'Submit answer'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void perform('run')}
                  disabled={busy !== null || engine.status === 'failed' || sql.trim() === ''}
                >
                  {busy === 'run' ? 'Running…' : 'Run query'}
                </Button>
                {busy && (
                  <Button variant="secondary" onClick={() => challengeEngine.stop()}>
                    Stop
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={resetQuery} disabled={busy !== null || session.draft === null}>
                Reset query
              </Button>
            </div>
            <p className={styles.hint}>
              <strong>Run query</strong> (<kbd>{RUN_SHORTCUT}</kbd>) shows your result without checking it.{' '}
              <strong>Submit answer</strong> checks it. Both use a fresh copy of the data, and queries that take longer than{' '}
              {QUERY_TIME_LIMIT_MS / 1000} seconds are stopped. <strong>Reset query</strong> brings back the starting query.
            </p>
          </Card>

          <Card title="Result and feedback">
            <div aria-live="polite" className={styles.outcome}>
              <OutcomeView outcome={outcome} busy={busy} engineStatus={engine.status} />
            </div>
            {engine.status === 'failed' && (
              <div className={styles.failure} role="alert">
                <p>{engine.failure}</p>
                <Button variant="secondary" onClick={() => void challengeEngine.retry().catch(() => undefined)}>
                  Try again
                </Button>
              </div>
            )}
            {outcome?.kind === 'submission' && outcome.feedback.kind === 'correct' && next && (
              <div className={styles.nextUp}>
                <Button to={challengePath(next.id)}>Next challenge: {next.title}</Button>
              </div>
            )}
          </Card>

          <HintList
            hints={challenge.hints}
            shown={session.hintsShown}
            onShowNext={() => updateChallengeSession(challenge.id, (current) => ({ hintsShown: Math.min(current.hintsShown + 1, challenge.hints.length) }))}
          />

          <SolutionPanel
            challengeId={challenge.id}
            unlocked={session.submissions > 0 || session.hintsShown >= challenge.hints.length}
            revealed={session.revealed}
            solved={session.solved}
            onReveal={() => updateChallengeSession(challenge.id, () => ({ revealed: true }))}
          />
        </div>

        <aside className={styles.side} aria-label="Tables for this challenge">
          <Card title="Tables" description="The tables this challenge uses. Query a table to see its rows.">
            <SchemaExplorer tables={engineUsable ? tables : null} onQueryTable={queryTable} />
          </Card>
        </aside>
      </div>

      <nav className={styles.pager} aria-label="Challenge navigation">
        {previous ? (
          <Link to={challengePath(previous.id)} className={styles.pagerLink}>
            <span className={styles.pagerLabel}>Previous challenge</span>
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        <Link to={NAV.challenges.path} className={styles.allLink}>
          All challenges
        </Link>
        {next ? (
          <Link to={challengePath(next.id)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
            <span className={styles.pagerLabel}>Next challenge</span>
            {next.title}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  )
}

function OutcomeView({ outcome, busy, engineStatus }: { outcome: Outcome | null; busy: 'run' | 'submit' | null; engineStatus: string }) {
  if (busy === 'submit') return <p className={styles.status}>Checking your answer…</p>
  if (busy === 'run') return <p className={styles.status}>Running your query…</p>
  if (!outcome) {
    return (
      <p className={styles.status}>
        {engineStatus === 'starting' ? 'Starting the SQL engine…' : 'Run your query to see its result, or submit it to have it checked.'}
      </p>
    )
  }
  if (outcome.kind === 'engine-error') {
    return (
      <div className={styles.failure} role="alert">
        <p>{outcome.text}</p>
      </div>
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
  const { feedback, result } = outcome
  // When the query failed, the feedback already quotes SQLite's message, so the result is not repeated.
  return (
    <>
      <FeedbackPanel feedback={feedback} />
      {!result.error && result.statements.length > 0 && (
        <>
          <h3 className={styles.subheading}>Your result</h3>
          <QueryResults result={result} />
        </>
      )}
    </>
  )
}
