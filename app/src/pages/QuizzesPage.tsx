import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { DifficultyBadge } from '../components/challenges/DifficultyBadge.tsx'
import { Tag } from '../components/challenges/Tag.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { QUIZZES, quizPath } from '../content/challenges.ts'
import styles from './QuizzesPage.module.css'

export function QuizzesPage() {
  return (
    <>
      <PageHeader
        title={NAV.quizzes.title}
        description="Short quizzes that check your understanding of SQL concepts. Each answer is explained as soon as you check it, and nothing is saved."
        actions={
          <Button to={NAV.challenges.path} variant="secondary">
            Write queries in challenges
          </Button>
        }
      />

      <Card title="All quizzes">
        {QUIZZES.length === 0 ? (
          <EmptyState title="No quizzes yet">Quizzes will be listed here as they are added.</EmptyState>
        ) : (
          <ul className={styles.list}>
            {QUIZZES.map((quiz) => (
              <li key={quiz.id} className={styles.item}>
                <h3 className={styles.title}>
                  <Link to={quizPath(quiz.id)}>{quiz.title}</Link>
                </h3>
                <p className={styles.summary}>{quiz.summary}</p>
                <p className={styles.meta}>
                  <DifficultyBadge level={quiz.difficulty} />
                  <Tag>
                    <span className="visually-hidden">Topics: </span>
                    {quiz.topic}
                  </Tag>
                  <Tag>
                    {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}, about {quiz.durationMinutes} min
                  </Tag>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
