import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { ExerciseCard } from '../components/paths/ExerciseCard.tsx'
import { formatDate } from '../components/progress/format.ts'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { SchemaExplorer } from '../components/sql/SchemaExplorer.tsx'
import { findPath, pathUrl, type CareerPath } from '../content/paths/catalog.ts'
import { pathProblemList, problemsUrl, problemUrl } from '../content/paths/chapters.ts'
import { loadProblem } from '../content/paths/problemText.ts'
import type { PathProblem, PathProblemSummary } from '../content/types.ts'
import {
  recordPathProblemHints,
  recordPathProblemSolutionRevealed,
  recordPathProblemSubmission,
  usePathProgress,
} from '../features/paths/pathStore.ts'
import { PROBLEM_DAYS, nextProblemDay } from '../features/paths/problemSummary.ts'
import type { TableInfo } from '../features/sql/protocol.ts'
import { challengeEngine } from '../features/sql/sqlEngine.ts'
import { useSqlEngine } from '../features/sql/useSqlEngine.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ProblemPage.module.css'
import { PathContentGate } from '../components/paths/PathContentGate.tsx'

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const

/** The page, once the path's content is loaded (PathContentGate). */
export function ProblemPage() {
  return (
    <PathContentGate part="problems">
      <ProblemPageContent />
    </PathContentGate>
  )
}

function ProblemPageContent() {
  const { pathId = '', day = '' } = useParams()
  const path = findPath(pathId)
  const number = /^\d{1,3}$/.test(day) ? Number(day) : NaN
  if (!path || !(number >= 1 && number <= PROBLEM_DAYS)) return <NotFoundPage />
  const problems = pathProblemList(path.id)
  const problem = problems[number - 1]
  if (!problem) return <UnwrittenDay path={path} day={number} written={problems.length} />
  // A new key per day, so moving to the next day starts with fresh page state.
  return <ProblemView key={problem.id} path={path} problem={problem} problems={problems} />
}

function UnwrittenDay({ path, day, written }: { path: CareerPath; day: number; written: number }) {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.paths.label, to: NAV.paths.path },
          { label: path.title, to: pathUrl(path.id) },
          { label: 'Daily problems', to: problemsUrl(path.id) },
        ]}
      />
      <PageHeader
        title={`Day ${day} is not written yet`}
        documentTitle={`Day ${day} · ${path.title}`}
        description={
          written > 0
            ? `Days 1 to ${written} are written. Later days are added in batches, and this one will open when it is ready.`
            : 'No daily problems are written for this path yet.'
        }
        actions={<Button to={problemsUrl(path.id)}>All daily problems</Button>}
      />
    </>
  )
}

function ProblemView({ path, problem, problems }: { path: CareerPath; problem: PathProblemSummary; problems: readonly PathProblemSummary[] }) {
  const record = usePathProgress().paths[path.id]
  const saved = record?.problems[problem.id]
  const ids = useMemo(() => problems.map((item) => item.id), [problems])
  const engine = useSqlEngine(challengeEngine)
  const [tables, setTables] = useState<TableInfo[] | null>(null)
  const engineUsable = engine.sqliteVersion !== null && engine.status !== 'failed'
  // The task, starter query and hints load with this day's 30-day group (src/content/paths/problemText.ts).
  const [text, setText] = useState<{ full: PathProblem } | { failed: true } | null>(null)
  const [textAttempt, setTextAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadProblem(problem).then(
      (full) => {
        if (!cancelled) setText({ full })
      },
      () => {
        if (!cancelled) setText({ failed: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [problem, textAttempt])
  const full = text && 'full' in text ? text.full : null

  useEffect(() => {
    void challengeEngine.start().catch(() => {
      // Reported through engine state ("failed").
    })
  }, [])

  useEffect(() => {
    if (!engineUsable || tables) return
    let cancelled = false
    challengeEngine.schema().then(
      (result) => {
        if (!cancelled) setTables(result)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [engineUsable, tables])

  const schema = useMemo(() => Object.fromEntries((tables ?? []).map((table) => [table.name, table.columns.map((column) => column.name)])), [tables])
  const previous = problems[problem.day - 2]
  const next = problems[problem.day]
  // Only the tables this problem uses, so the learner sees exactly the columns they need.
  const problemTables = useMemo(
    () => (tables ? tables.filter((table) => problem.tables.includes(table.name)) : null),
    [tables, problem.tables],
  )
  // Where to go once this day is solved: the next written day, or the first unsolved one if every later day is done.
  const continueDay = saved?.solvedAt ? (next ?? problems[(nextProblemDay(ids, record) ?? 0) - 1]) : undefined

  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.paths.label, to: NAV.paths.path },
          { label: path.title, to: pathUrl(path.id) },
          { label: 'Daily problems', to: problemsUrl(path.id) },
        ]}
      />
      <PageHeader
        title={`Day ${problem.day}: ${problem.title}`}
        documentTitle={`Day ${problem.day}: ${problem.title} · ${path.title}`}
        description={problem.summary}
        meta={`${problem.topic} · ${LEVEL_LABELS[problem.difficulty]} · About ${problem.durationMinutes} minutes · Day ${problem.day} of ${PROBLEM_DAYS}`}
      />

      <p className={styles.status} role="status">
        {saved?.solvedAt
          ? `Solved on ${formatDate(saved.solvedAt)}${saved.attempts > 1 ? ` after ${saved.attempts} attempts` : ''}. You can keep practising; your progress is kept.`
          : saved && saved.attempts > 0
            ? `${saved.attempts} ${saved.attempts === 1 ? 'attempt' : 'attempts'} so far. Your attempts are saved; come back any time.`
            : 'Not tried yet. There is no deadline: this problem stays open whenever you come back.'}
        {continueDay && continueDay.id !== problem.id && (
          <>
            {' '}
            <Link to={problemUrl(path.id, continueDay.day)} className={styles.continue}>
              Next: Day {continueDay.day}, {continueDay.title}
            </Link>
          </>
        )}
      </p>

      {full && (
        <div className={styles.about}>
          <Card title="This problem practises">
            <ul className={styles.bullets}>
              {full.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </Card>
          {full.prerequisites.length > 0 && (
            <Card title="You should already know">
              <ul className={styles.bullets}>
                {full.prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Card
        title={problem.tables.length === 1 ? 'The table for this problem' : 'Tables for this problem'}
        description={
          problem.tables.length > 0
            ? 'Columns and types in the bookstore database. Your query runs on a fresh copy, so nothing you try can change it.'
            : undefined
        }
        className={styles.schema}
      >
        {problem.tables.length > 0 ? (
          <SchemaExplorer tables={engineUsable ? problemTables : null} />
        ) : (
          <p>This problem's data is written in the starter query itself, so it does not use the bookstore tables.</p>
        )}
      </Card>

      {text && 'failed' in text && (
        <div className={styles.failure} role="alert">
          <p>Day {problem.day} could not be loaded. Check your connection and try again.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setText(null)
              setTextAttempt((count) => count + 1)
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {!text && (
        <p className={styles.loading} role="status">
          Loading Day {problem.day}…
        </p>
      )}
      {full && (
        <ExerciseCard
          exercise={full}
          label={`Day ${problem.day}`}
          headingLevel={2}
          expected={problem.expected}
          saved={saved}
          schema={schema}
          engineFailed={engine.status === 'failed'}
          recorder={{
            submitted: (correct) => recordPathProblemSubmission(path.id, problem.id, correct, ids),
            hintsShown: (count) => recordPathProblemHints(path.id, problem.id, count),
            solutionRevealed: () => recordPathProblemSolutionRevealed(path.id, problem.id),
          }}
        />
      )}
      {engine.status === 'failed' && (
        <div className={styles.failure} role="alert">
          <p>{engine.failure}</p>
          <Button variant="secondary" onClick={() => void challengeEngine.retry().catch(() => undefined)}>
            Try again
          </Button>
        </div>
      )}

      <nav className={styles.pager} aria-label="Day navigation">
        {previous ? (
          <Link to={problemUrl(path.id, previous.day)} className={styles.pagerLink}>
            <span className={styles.pagerLabel}>Previous day</span>
            Day {previous.day}: {previous.title}
          </Link>
        ) : (
          <span />
        )}
        <Link to={problemsUrl(path.id)} className={styles.allLink}>
          All daily problems
        </Link>
        {next ? (
          <Link to={problemUrl(path.id, next.day)} className={styles.pagerLink} data-direction="next">
            <span className={styles.pagerLabel}>Next day</span>
            Day {next.day}: {next.title}
          </Link>
        ) : (
          <span className={styles.pagerNote}>
            {problem.day < PROBLEM_DAYS ? `Day ${problem.day + 1} is not written yet.` : 'This is the last day.'}
          </span>
        )}
      </nav>
    </>
  )
}
