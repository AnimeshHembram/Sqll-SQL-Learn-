import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { QueryResults } from '../components/sql/QueryResults.tsx'
import { SchemaExplorer } from '../components/sql/SchemaExplorer.tsx'
import { SqlEditor } from '../components/sql/SqlEditor.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import type { ExecuteResult, TableInfo } from '../features/sql/protocol.ts'
import { EngineError, QUERY_TIME_LIMIT_MS, sqlEngine } from '../features/sql/sqlEngine.ts'
import { useSqlEngine } from '../features/sql/useSqlEngine.ts'
import styles from './PracticePage.module.css'

/** What the editor holds, kept while the learner visits other pages in this tab. */
let draft = 'SELECT title, author, price\nFROM books\nORDER BY price DESC;'

type Outcome =
  | { kind: 'result'; result: ExecuteResult }
  | { kind: 'message'; text: string }
  | { kind: 'engine-error'; text: string }

/** State a lesson passes when it opens an example here. */
export interface PracticeLocationState {
  sql?: string
}

const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const RUN_SHORTCUT = isApple ? '⌘ + Enter' : 'Ctrl + Enter'

export function PracticePage() {
  const engine = useSqlEngine()
  const location = useLocation()
  const navigate = useNavigate()
  const [sql, setSql] = useState(() => (location.state as PracticeLocationState | null)?.sql ?? draft)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [running, setRunning] = useState(false)
  const [tables, setTables] = useState<TableInfo[] | null>(null)
  const [schemaKey, setSchemaKey] = useState(0)
  const [confirmingReset, setConfirmingReset] = useState(false)
  // Each run gets a number; only the latest run may show its result.
  const latestRun = useRef(0)

  const engineUsable = engine.sqliteVersion !== null && engine.status !== 'failed'

  // Start loading SQLite as soon as the page opens.
  useEffect(() => {
    void sqlEngine.start().catch(() => {
      // Reported through engine state ("failed").
    })
  }, [])

  // Forget the example passed by a lesson, so a page refresh does not reload it.
  useEffect(() => {
    if (location.state) void navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  // Keep the explorer in sync after runs, resets and engine restarts.
  useEffect(() => {
    if (!engineUsable) return
    let cancelled = false
    sqlEngine.schema().then(
      (result) => {
        if (!cancelled) setTables(result)
      },
      () => {
        // A failed schema read leaves the previous list in place.
      },
    )
    return () => {
      cancelled = true
    }
  }, [engineUsable, engine.sessionVersion, schemaKey])

  const schemaForCompletion = useMemo(
    () => Object.fromEntries((tables ?? []).map((table) => [table.name, table.columns.map((column) => column.name)])),
    [tables],
  )

  const updateSql = useCallback((value: string) => {
    draft = value
    setSql(value)
  }, [])

  const run = useCallback(async () => {
    if (running) return
    const runId = ++latestRun.current
    setRunning(true)
    try {
      const result = await sqlEngine.run(sql)
      if (runId === latestRun.current) setOutcome({ kind: 'result', result })
    } catch (error) {
      if (runId === latestRun.current) {
        setOutcome({ kind: 'engine-error', text: error instanceof Error ? error.message : String(error) })
      }
    } finally {
      if (runId === latestRun.current) {
        setRunning(false)
        setSchemaKey((key) => key + 1)
      }
    }
  }, [running, sql])

  const resetDatabase = async () => {
    setConfirmingReset(false)
    latestRun.current += 1
    try {
      await sqlEngine.reset()
      setOutcome({ kind: 'message', text: 'The database was reset to the original bookstore data.' })
    } catch (error) {
      setOutcome({
        kind: 'engine-error',
        text: error instanceof EngineError ? error.message : 'The database could not be reset. Try again.',
      })
    }
    setSchemaKey((key) => key + 1)
  }

  const queryTable = (tableName: string) => {
    updateSql(`SELECT *\nFROM "${tableName.replaceAll('"', '""')}"\nLIMIT 10;`)
  }

  return (
    <>
      <PageHeader title={NAV.practice.title} description={NAV.practice.description} />

      <div className={styles.layout}>
        <div className={styles.main}>
          <Card title="Query">
            <SqlEditor value={sql} onChange={updateSql} onRun={() => void run()} label="SQL query" schema={schemaForCompletion} />
            <div className={styles.toolbar}>
              <div className={styles.actions}>
                <Button onClick={() => void run()} disabled={running || engine.status === 'failed'}>
                  {running ? 'Running…' : 'Run'}
                </Button>
                {running && (
                  <Button variant="secondary" onClick={() => sqlEngine.stop()}>
                    Stop
                  </Button>
                )}
                <Button variant="secondary" onClick={() => updateSql('')} disabled={sql === ''}>
                  Clear
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={() => setConfirmingReset(true)}
                disabled={running || !engineUsable}
              >
                Reset database
              </Button>
            </div>
            <p className={styles.hint}>
              Press <kbd>{RUN_SHORTCUT}</kbd> to run. Several statements separated by semicolons run in order. A query
              that takes longer than {QUERY_TIME_LIMIT_MS / 1000} seconds is stopped.
            </p>
          </Card>

          <Card title="Results">
            <p className={styles.status} role="status">
              <EngineStatusText running={running} outcome={outcome} />
            </p>
            {engine.status === 'failed' && (
              <div className={styles.failure}>
                <p>{engine.failure}</p>
                <Button variant="secondary" onClick={() => void sqlEngine.retry().catch(() => undefined)}>
                  Try again
                </Button>
              </div>
            )}
            {outcome?.kind === 'result' && <QueryResults result={outcome.result} />}
            {outcome?.kind === 'engine-error' && (
              <div className={styles.engineError} role="alert">
                {outcome.text}
              </div>
            )}
            {outcome === null && engine.status !== 'failed' && (
              <p className={styles.placeholder}>Run a query to see its results here.</p>
            )}
          </Card>
        </div>

        <aside className={styles.explorer} aria-label="Database explorer">
          <Card
            title="Database"
            description="The bookstore sample database. Your changes are kept until you reset the database or reload the page."
          >
            <SchemaExplorer tables={engineUsable ? tables : null} onQueryTable={queryTable} />
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmingReset}
        title="Reset the database?"
        confirmLabel="Reset database"
        onConfirm={() => void resetDatabase()}
        onCancel={() => setConfirmingReset(false)}
      >
        <p>
          This restores the original bookstore data. Every change made in this session, such as inserted rows or new
          tables, will be lost.
        </p>
        <p>Your query in the editor is kept.</p>
      </ConfirmDialog>
    </>
  )
}

function EngineStatusText({ running, outcome }: { running: boolean; outcome: Outcome | null }) {
  const engine = useSqlEngine()
  if (engine.status === 'starting') return <>Starting the SQL engine…</>
  if (engine.status === 'failed') return <>The SQL engine is not available.</>
  if (running) return <>Running…</>
  if (outcome?.kind === 'result') {
    const { statements, error, durationMs } = outcome.result
    const ran = statements.length
    const time = durationMs < 1 ? 'under 1 ms' : `${Math.round(durationMs)} ms`
    if (error) return <>Stopped at an error after {ran} successful {ran === 1 ? 'statement' : 'statements'}.</>
    return (
      <>
        Ran {ran} {ran === 1 ? 'statement' : 'statements'} in {time}.
      </>
    )
  }
  if (outcome?.kind === 'message') return <>{outcome.text}</>
  if (outcome?.kind === 'engine-error') return <>The query did not finish.</>
  return engine.sqliteVersion ? <>Ready. SQLite {engine.sqliteVersion}.</> : <>Starting the SQL engine…</>
}
