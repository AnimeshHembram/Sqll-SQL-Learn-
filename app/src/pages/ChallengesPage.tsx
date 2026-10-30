import { useId } from 'react'
import { Link, useSearchParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { ChallengeList } from '../components/challenges/ChallengeList.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import {
  CHALLENGES,
  CHALLENGE_TOPICS,
  challengePath,
  firstBeginnerChallenge,
  isLevel,
} from '../content/challenges.ts'
import { formatLevel } from '../content/index.ts'
import { LEVELS } from '../content/types.ts'
import styles from './ChallengesPage.module.css'

/** Filters live in the address (?difficulty=beginner&topic=WHERE), so a filtered list can be bookmarked or shared. */
export function ChallengesPage() {
  const [params, setParams] = useSearchParams()
  const difficultyId = useId()
  const topicId = useId()

  const rawDifficulty = params.get('difficulty')
  const rawTopic = params.get('topic')
  const difficulty = isLevel(rawDifficulty) ? rawDifficulty : null
  const topic = rawTopic !== null && CHALLENGE_TOPICS.includes(rawTopic) ? rawTopic : null
  const filtered = difficulty !== null || topic !== null

  const shown = CHALLENGES.filter(
    (challenge) => (difficulty === null || challenge.difficulty === difficulty) && (topic === null || challenge.topic === topic),
  )

  const setFilter = (name: 'difficulty' | 'topic', value: string) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true })
  }

  const clearFilters = () => setParams(new URLSearchParams(), { replace: true })
  const first = firstBeginnerChallenge()

  return (
    <>
      <PageHeader
        title={NAV.challenges.title}
        description="Write a query that answers a question about the bookstore database. Your result is checked automatically, and any query that returns the right data is accepted."
        actions={
          <>
            {first && <Button to={challengePath(first.id)}>Start with a beginner challenge</Button>}
            <Button to={NAV.quizzes.path} variant="secondary">
              Take a quiz instead
            </Button>
          </>
        }
      />

      <Card title="All challenges" description={`${CHALLENGES.length} challenges, from your first SELECT to window functions.`}>
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
            Try another difficulty or topic.
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
