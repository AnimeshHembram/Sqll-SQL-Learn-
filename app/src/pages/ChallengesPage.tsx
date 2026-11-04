import { useId } from 'react'
import { Link, useSearchParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { ChallengeList } from '../components/challenges/ChallengeList.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import {
  CHALLENGES,
  CHALLENGE_TOPICS,
  challengePath,
  firstBeginnerChallenge,
  isLevel,
} from '../content/challenges.ts'
import { formatLevel } from '../content/index.ts'
import { LEVELS } from '../content/types.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import { challengeCount, isChallengeSolved, nextUnsolvedChallenge } from '../features/progress/progressSummary.ts'
import styles from './ChallengesPage.module.css'

const STATUSES = { unsolved: 'Not solved yet', solved: 'Solved' } as const
type Status = keyof typeof STATUSES

function isStatus(value: string | null): value is Status {
  return value !== null && value in STATUSES
}

/** Filters live in the address (?difficulty=beginner&topic=WHERE&status=unsolved), so a filtered list can be bookmarked or shared. */
export function ChallengesPage() {
  const [params, setParams] = useSearchParams()
  const difficultyId = useId()
  const topicId = useId()
  const statusId = useId()
  const progress = useProgress()

  const rawDifficulty = params.get('difficulty')
  const rawTopic = params.get('topic')
  const difficulty = isLevel(rawDifficulty) ? rawDifficulty : null
  const topic = rawTopic !== null && CHALLENGE_TOPICS.includes(rawTopic) ? rawTopic : null
  const rawStatus = params.get('status')
  const status = isStatus(rawStatus) ? rawStatus : null
  const filtered = difficulty !== null || topic !== null || status !== null

  const shown = CHALLENGES.filter(
    (challenge) =>
      (difficulty === null || challenge.difficulty === difficulty) &&
      (topic === null || challenge.topic === topic) &&
      (status === null || isChallengeSolved(progress, challenge.id) === (status === 'solved')),
  )
  const solvedCount = challengeCount(CHALLENGES, progress)

  const setFilter = (name: 'difficulty' | 'topic' | 'status', value: string) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true })
  }

  const clearFilters = () => setParams(new URLSearchParams(), { replace: true })
  const first = firstBeginnerChallenge()
  const nextUnsolved = nextUnsolvedChallenge(CHALLENGES, progress)

  return (
    <>
      <PageHeader
        title={NAV.challenges.title}
        description="Write a query that answers a question about the bookstore database. Your result is checked automatically, and any query that returns the right data is accepted."
        actions={
          <>
            {solvedCount.done === 0
              ? first && <Button to={challengePath(first.id)}>Start with a beginner challenge</Button>
              : nextUnsolved && <Button to={challengePath(nextUnsolved.id)}>Continue: {nextUnsolved.title}</Button>}
            <Button to={NAV.quizzes.path} variant="secondary">
              Take a quiz instead
            </Button>
          </>
        }
      />

      <Card title="All challenges" description={`${CHALLENGES.length} challenges, from your first SELECT to window functions.`}>
        <div className={styles.progress}>
          <p className={styles.progressText}>
            {solvedCount.done === solvedCount.total
              ? `You have solved all ${solvedCount.total} challenges.`
              : `You have solved ${solvedCount.done} of ${solvedCount.total} challenges.`}
          </p>
          <ProgressBar done={solvedCount.done} total={solvedCount.total} label="Challenges solved" />
        </div>
        <form className={styles.filters} aria-label="Filter challenges" onSubmit={(event) => event.preventDefault()}>
          <div className={styles.field}>
            <label htmlFor={difficultyId}>Difficulty</label>
            <select id={difficultyId} value={difficulty ?? ''} onChange={(event) => setFilter('difficulty', event.target.value)}>
              <option value="">All difficulties</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {formatLevel(level)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={topicId}>Topic</label>
            <select id={topicId} value={topic ?? ''} onChange={(event) => setFilter('topic', event.target.value)}>
              <option value="">All topics</option>
              {CHALLENGE_TOPICS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={statusId}>Status</label>
            <select id={statusId} value={status ?? ''} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Solved and not solved</option>
              {(Object.keys(STATUSES) as Status[]).map((value) => (
                <option key={value} value={value}>
                  {STATUSES[value]}
                </option>
              ))}
            </select>
          </div>
          {filtered && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </form>

        <p className={styles.count} role="status">
          {filtered ? `Showing ${shown.length} of ${CHALLENGES.length} challenges.` : `Showing all ${CHALLENGES.length} challenges.`}
        </p>

        {shown.length > 0 ? (
          <ChallengeList challenges={shown} />
        ) : (
          <EmptyState
            title="No challenges match these filters"
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Show all challenges
              </Button>
            }
          >
            {status === 'unsolved' && difficulty === null && topic === null
              ? 'You have solved every challenge. Well done.'
              : 'Try another difficulty, topic or status.'}
          </EmptyState>
        )}
      </Card>

      <p className={styles.note}>
        Challenges use the same bookstore database as the lessons, with a few extra tables for customers and orders. Every
        answer runs on its own fresh copy of the data, so nothing you do here changes the{' '}
        <Link to={NAV.practice.path}>practice space</Link>.
      </p>
    </>
  )
}
