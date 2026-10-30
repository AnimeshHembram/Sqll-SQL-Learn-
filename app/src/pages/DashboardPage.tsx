import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import styles from './DashboardPage.module.css'

/** The three sections a learner moves through, in order. */
const LEARNING_PATH = [NAV.learn, NAV.practice, NAV.challenges]

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Welcome to SQL Learner"
        documentTitle={NAV.dashboard.title}
        description="Learn SQL step by step in your browser, with nothing to install."
        actions={<Button to={NAV.learn.path}>Start learning</Button>}
      />

      <div className={styles.grid}>
        <Card title="Continue learning">
          <EmptyState title="Nothing to continue yet">
            When you start a lesson, you can pick up where you left off from here.
          </EmptyState>
        </Card>

        <Card title="Recently viewed">
          <EmptyState title="Nothing viewed yet">
            Lessons and reference pages you open will be listed here.
          </EmptyState>
        </Card>

        <Card title="Your progress" className={styles.wide}>
          <EmptyState title="No progress yet">
            Lessons and challenges you complete will be counted here.
          </EmptyState>
        </Card>

        <Card title="Learning modules" className={styles.wide}>
          <EmptyState
            title="No modules yet"
            action={
              <Button to={NAV.learn.path} variant="secondary">
                Go to {NAV.learn.label}
              </Button>
            }
          >
            SQL fundamentals will be the first module. Modules will be listed here and in{' '}
            {NAV.learn.label}.
          </EmptyState>
        </Card>

        <Card title="How SQL Learner works" className={styles.wide}>
          <ol className={styles.path}>
            {LEARNING_PATH.map((item) => (
              <li key={item.path} className={styles.step}>
                <Link to={item.path} className={styles.stepLink}>
                  {item.label}
                </Link>
                <p className={styles.stepText}>{item.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}
