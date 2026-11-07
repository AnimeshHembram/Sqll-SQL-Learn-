import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { formatDate } from '../components/progress/format.ts'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { findPath, pathUrl } from '../content/paths/catalog.ts'
import { pathProblemList, problemUrl } from '../content/paths/chapters.ts'
import type { Level } from '../content/types.ts'
import { usePathProgress } from '../features/paths/pathStore.ts'
import {
  PROBLEM_DAYS,
  PROBLEM_MILESTONES,
  nextProblemDay,
  problemState,
  problemStreak,
  solvedCount,
  type ProblemState,
} from '../features/paths/problemSummary.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ProblemsPage.module.css'

const STATE_LABELS: Record<ProblemState, string> = {
  solved: 'Solved',
  attempted: 'Attempted',
  open: 'Not tried yet',
  unwritten: 'Not written yet',
}

const LEVEL_LABELS: Record<Level, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

export function ProblemsPage() {
  const { pathId = '' } = useParams()
  const path = findPath(pathId)
  const record = usePathProgress().paths[pathId]
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('')
  if (!path) return <NotFoundPage />

  const problems = pathProblemList(path.id)
  const ids = problems.map((problem) => problem.id)
  const written = problems.length
  const solved = solvedCount(ids, record)
  const streak = problemStreak(ids, record, new Date())
  const nextDay = nextProblemDay(ids, record)
  const next = nextDay ? problems[nextDay - 1] : undefined
  const topics = [...new Set(problems.map((problem) => problem.topic))]
  const visible = problems.filter(
    (problem) =>
      (!topic || problem.topic === topic) &&
      (!level || problem.difficulty === level) &&
      (!status || problemState(problem.id, record) === status),
  )

  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.paths.label, to: NAV.paths.path },
          { label: path.title, to: pathUrl(path.id) },
        ]}
      />
      <PageHeader
        title="Daily SQL problems"
        documentTitle={`Daily problems · ${path.title}`}
        description={`${PROBLEM_DAYS} problems that build ${path.title.toLowerCase()} skills one day at a time, from simple filters to full reports.`}
        meta={
          written > 0
            ? `Days 1 to ${written} are written and playable. The other ${PROBLEM_DAYS - written} are added in batches and cannot be opened yet.`
            : `No problems are written for this path yet.`
        }
        actions={
          next ? (
            <Button to={problemUrl(path.id, next.day)}>
              {solved === 0 ? 'Start' : 'Continue'}: Day {next.day}, {next.title}
            </Button>
          ) : written > 0 ? (
            <p className={styles.allDone}>Every written problem is solved. New days appear here as they are added.</p>
          ) : undefined
        }
      />

      {written > 0 && (
        <>
          <dl className={styles.stats}>
            <div className={styles.wide}>
              <dt>Solved</dt>
              <dd>
                {solved} of {written} written problems
                <ProgressBar done={solved} total={written} label="Written problems solved" />
              </dd>
            </div>
            <div>
              <dt>Current streak</dt>
              <dd>
                {streak.current} {streak.current === 1 ? 'day' : 'days'}
              </dd>
            </div>
            <div>
              <dt>Longest streak</dt>
              <dd>
                {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
              </dd>
            </div>
            <div>
              <dt>Milestones</dt>
              <dd>
                {PROBLEM_MILESTONES.filter((milestone) => record?.badges[milestone.id]).length} of {PROBLEM_MILESTONES.length}
              </dd>
            </div>
          </dl>
          <p className={styles.note}>
            There are no deadlines. Every written day is open, in any order, and missing a day never locks anything or takes
            progress away. The streak counts the days on which you solved at least one problem.
          </p>

          <Card title="Milestones" description="Reached by the number of problems you solve, in any order." className={styles.card}>
            <ul className={styles.milestones}>
              {PROBLEM_MILESTONES.map((milestone) => {
                const earned = record?.badges[milestone.id]
                return (
                  <li key={milestone.id} className={styles.milestone} data-earned={earned ? true : undefined}>
                    <span className={styles.milestoneTitle}>
                      {earned ? '✓ ' : ''}
                      {milestone.title}
                    </span>
                    <span className={styles.milestoneDetail}>
                      {earned
                        ? `Reached on ${formatDate(earned.earnedAt)}`
                        : milestone.solved > written
                          ? `Solve ${milestone.solved}. Only ${written} are written so far.`
                          : `Solve ${milestone.solved}: ${solved} of ${milestone.solved} so far`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}

      <section aria-labelledby="year-map" className={styles.section}>
        <h2 id="year-map" className={styles.sectionTitle}>
          All {PROBLEM_DAYS} days
        </h2>
        <ul className={styles.legend} aria-label="Key">
          {(['solved', 'attempted', 'open', 'unwritten'] as const).map((state) => (
            <li key={state}>
              <span className={styles.swatch} data-state={state} aria-hidden="true" /> {STATE_LABELS[state]}
            </li>
          ))}
        </ul>
        <ol className={styles.days}>
          {Array.from({ length: PROBLEM_DAYS }, (_, index) => {
            const day = index + 1
            const problem = problems[index]
            const state = problemState(problem?.id, record)
            return (
              <li key={day}>
                {problem ? (
                  <Link
                    to={problemUrl(path.id, day)}
                    className={styles.day}
                    data-state={state}
                    aria-label={`Day ${day}: ${problem.title}. ${STATE_LABELS[state]}.`}
                    title={`Day ${day}: ${problem.title}`}
                  >
                    {day}
                  </Link>
                ) : (
                  <span className={styles.day} data-state="unwritten" title={`Day ${day}: not written yet`}>
                    <span className="visually-hidden">Day </span>
                    {day}
                    <span className="visually-hidden">: not written yet</span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {written > 0 && (
        <section aria-labelledby="problem-list" className={styles.section}>
          <h2 id="problem-list" className={styles.sectionTitle}>
            Written problems
          </h2>
          <div className={styles.filters}>
            <label>
              Topic
              <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                <option value="">All topics</option>
                {topics.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficulty
              <select value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">All levels</option>
                {(Object.keys(LEVEL_LABELS) as Level[]).map((item) => (
                  <option key={item} value={item}>
                    {LEVEL_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Any status</option>
                <option value="solved">Solved</option>
                <option value="attempted">Attempted</option>
                <option value="open">Not tried yet</option>
              </select>
            </label>
          </div>
          <p className={styles.note} role="status">
            Showing {visible.length} of {written} written problems.
          </p>
          <ol className={styles.list}>
            {visible.map((problem) => {
              const state = problemState(problem.id, record)
              return (
                <li key={problem.id} className={styles.item}>
                  <span className={styles.itemDay}>Day {problem.day}</span>
                  <span className={styles.itemMain}>
                    <Link to={problemUrl(path.id, problem.day)}>{problem.title}</Link>
                    <span className={styles.itemMeta}>
                      {problem.topic} · {LEVEL_LABELS[problem.difficulty]}
                    </span>
                  </span>
                  <span className={styles.itemState} data-state={state}>
                    {STATE_LABELS[state]}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </>
  )
}
