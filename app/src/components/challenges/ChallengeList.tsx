import { Link } from 'react-router'
import { challengePath, type ContentChallenge } from '../../content/challenges.ts'
import { useProgress } from '../../features/progress/progressStore.ts'
import { isChallengeSolved } from '../../features/progress/progressSummary.ts'
import { CompletionBadge } from '../progress/CompletionBadge.tsx'
import { DifficultyBadge } from './DifficultyBadge.tsx'
import { Tag } from './Tag.tsx'
import styles from './ChallengeList.module.css'

interface ChallengeListProps {
  challenges: readonly ContentChallenge[]
  /** Heading level for each challenge title, so the list fits the page outline. */
  headingLevel?: 'h2' | 'h3'
}

/** Challenges with their difficulty, topic, estimated time and whether they are solved, each linking to its page. */
export function ChallengeList({ challenges, headingLevel: Heading = 'h3' }: ChallengeListProps) {
  const progress = useProgress()

  return (
    <ol className={styles.list}>
      {challenges.map((challenge) => {
        const solved = isChallengeSolved(progress, challenge.id)
        return (
          <li key={challenge.id} className={styles.item}>
            <span className={styles.number} aria-hidden="true" data-solved={solved || undefined}>
              {solved ? '✓' : challenge.order}
            </span>
            <div className={styles.body}>
              <Heading className={styles.title}>
                <Link to={challengePath(challenge.id)} className={styles.link}>
                  <span className="visually-hidden">Challenge {challenge.order}: </span>
                  {challenge.title}
                </Link>
              </Heading>
              <p className={styles.summary}>{challenge.summary}</p>
              <p className={styles.meta}>
                <DifficultyBadge level={challenge.difficulty} />
                <Tag>
                  <span className="visually-hidden">Topic: </span>
                  {challenge.topic}
                </Tag>
                <Tag>About {challenge.durationMinutes} min</Tag>
                {solved && <CompletionBadge label="Solved" />}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
