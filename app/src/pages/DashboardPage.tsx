import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import {
  MODULES,
  describeModule,
  findFirstLesson,
  formatLevel,
  lessonPath,
  modulePath,
} from '../content/index.ts'
import {
  CHALLENGES,
  QUIZZES,
  challengePath,
  describeChallengeLevels,
  firstBeginnerChallenge,
  quizPath,
} from '../content/challenges.ts'
import { recallLastLesson } from '../content/lastLesson.ts'
import styles from './DashboardPage.module.css'

/** The sections a learner moves through, in order. */
const LEARNING_PATH = [NAV.learn, NAV.practice, NAV.challenges, NAV.quizzes]

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
          <ContinueLearning />
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
          {MODULES.length === 0 ? (
            <EmptyState title="No modules yet">Modules will be listed here as they are added.</EmptyState>
          ) : (
            <ul className={styles.modules}>
              {MODULES.map((module) => (
                <li key={module.id} className={styles.module}>
                  <Link to={modulePath(module.id)} className={styles.moduleLink}>
                    {module.title}
                  </Link>
                  <p className={styles.moduleSummary}>{module.summary}</p>
                  <p className={styles.moduleMeta}>{describeModule(module)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Challenges">
          <ChallengeEntry />
        </Card>

        <Card title="Quizzes">
          {QUIZZES.length === 0 ? (
            <EmptyState title="No quizzes yet">Quizzes will be listed here as they are added.</EmptyState>
          ) : (
            <ul className={styles.quizzes}>
              {QUIZZES.map((quiz) => (
                <li key={quiz.id}>
                  <Link to={quizPath(quiz.id)} className={styles.moduleLink}>
                    {quiz.title}
                  </Link>
                  <p className={styles.moduleMeta}>
                    {formatLevel(quiz.difficulty)}, {quiz.questions.length} questions
                  </p>
                </li>
              ))}
            </ul>
          )}
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

/** How many challenges exist, and where a beginner should start. Counts come from the content, not from progress. */
function ChallengeEntry() {
  const first = firstBeginnerChallenge()
  if (!first) {
    return <EmptyState title="No challenges yet">Challenges will appear here once they are added.</EmptyState>
  }
  return (
    <div className={styles.continue}>
      <p className={styles.continueSummary}>
        {CHALLENGES.length} challenges to solve: {describeChallengeLevels()}. Each one checks your query's result automatically.
      </p>
      <p className={styles.continueLesson}>Start here: {first.title}</p>
      <p className={styles.continueSummary}>{first.summary}</p>
      <div className={styles.buttons}>
        <Button to={challengePath(first.id)} variant="secondary">
          Start the first challenge
        </Button>
        <Link to={NAV.challenges.path} className={styles.moduleLink}>
          Browse all challenges
        </Link>
      </div>
    </div>
  )
}

/** The last lesson opened in this browser, or a prompt to start for a new learner. */
function ContinueLearning() {
  const last = recallLastLesson()

  if (!last) {
    const first = findFirstLesson()
    return (
      <EmptyState
        title="You have not opened a lesson yet"
        action={
          first && (
            <Button to={lessonPath(first.module.id, first.lesson.id)} variant="secondary">
              Start the first lesson
            </Button>
          )
        }
      >
        {first
          ? `Begin with "${first.lesson.title}" in ${first.module.title}. After that, your last lesson will appear here.`
          : 'Lessons will appear here once they are added.'}
      </EmptyState>
    )
  }

  const { module, lesson, index } = last

  return (
    <div className={styles.continue}>
      <p className={styles.continueModule}>
        {module.title}, lesson {index + 1} of {module.lessons.length}
      </p>
      <p className={styles.continueLesson}>{lesson.title}</p>
      <p className={styles.continueSummary}>{lesson.summary}</p>
      <Button to={lessonPath(module.id, lesson.id)} variant="secondary">
        Resume learning
      </Button>
    </div>
  )
}
