import { useState } from 'react'
import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { CompletionBadge } from '../components/progress/CompletionBadge.tsx'
import { ProgressOverview } from '../components/progress/ProgressOverview.tsx'
import { RecentActivity } from '../components/progress/RecentActivity.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import {
  MODULES,
  describeModule,
  findFirstLesson,
  findLesson,
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
import type { ProgressData } from '../features/progress/progressModel.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import {
  challengeCount,
  isLessonComplete,
  moduleCount,
  nextIncompleteLesson,
  nextUnsolvedChallenge,
} from '../features/progress/progressSummary.ts'
import styles from './DashboardPage.module.css'

/** The sections a learner moves through, in order. */
const LEARNING_PATH = [NAV.learn, NAV.practice, NAV.challenges, NAV.quizzes]

function hasProgress(progress: ProgressData): boolean {
  return Object.keys(progress.activity).length > 0 || Object.keys(progress.lessons).length > 0
}

export function DashboardPage() {
  const progress = useProgress()
  // Fixed for the visit, so streaks and "today" do not shift while the page is open.
  const [now] = useState(() => new Date())
  const returning = hasProgress(progress)

  return (
    <>
      <PageHeader
        title={returning ? 'Welcome back' : 'Welcome to SQL Learner'}
        documentTitle={NAV.dashboard.title}
        description={
          returning
            ? 'Pick up where you left off. Your progress is saved in this browser only.'
            : 'Learn SQL step by step in your browser, with nothing to install.'
        }
        actions={!returning && <Button to={NAV.learn.path}>Start learning</Button>}
      />

      <div className={styles.grid}>
        <Card title="Continue learning">
          <ContinueLearning progress={progress} />
        </Card>

        <Card title="Recent activity">
          <RecentActivity events={progress.recent} now={now} />
        </Card>

        <Card title="Your progress" className={styles.wide}>
          <ProgressOverview progress={progress} now={now} />
        </Card>

        <Card title="Learning modules" className={styles.wide}>
          {MODULES.length === 0 ? (
            <EmptyState title="No modules yet">Modules will be listed here as they are added.</EmptyState>
          ) : (
            <ul className={styles.modules}>
              {MODULES.map((module) => {
                const count = moduleCount(module, progress)
                return (
                  <li key={module.id} className={styles.module}>
                    <Link to={modulePath(module.id)} className={styles.moduleLink}>
                      {module.title}
                    </Link>
                    <p className={styles.moduleSummary}>{module.summary}</p>
                    <p className={styles.moduleMeta}>
                      {describeModule(module)}. {count.done} of {count.total} complete.
                    </p>
                    <ProgressBar
                      done={count.done}
                      total={count.total}
                      label={`${module.title} lessons complete`}
                      className={styles.moduleBar}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Challenges">
          <ChallengeEntry progress={progress} />
        </Card>

        <Card title="Quizzes">
          {QUIZZES.length === 0 ? (
            <EmptyState title="No quizzes yet">Quizzes will be listed here as they are added.</EmptyState>
          ) : (
            <ul className={styles.quizzes}>
              {QUIZZES.map((quiz) => {
                const result = progress.quizzes[quiz.id]
                return (
                  <li key={quiz.id}>
                    <Link to={quizPath(quiz.id)} className={styles.moduleLink}>
                      {quiz.title}
                    </Link>
                    <p className={styles.quizMeta}>
                      <span>
                        {formatLevel(quiz.difficulty)}, {quiz.questions.length} questions
                      </span>
                      {result && <CompletionBadge label={`Best ${result.bestScore}/${result.total}`} />}
                    </p>
                  </li>
                )
              })}
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

/** Where to go next with challenges: the first one for a newcomer, then the next unsolved one. */
function ChallengeEntry({ progress }: { progress: ProgressData }) {
  const first = firstBeginnerChallenge()
  if (!first) {
    return <EmptyState title="No challenges yet">Challenges will appear here once they are added.</EmptyState>
  }

  const count = challengeCount(CHALLENGES, progress)
  const next = nextUnsolvedChallenge(CHALLENGES, progress)

  if (count.done === 0 || !next) {
    const allSolved = count.done > 0 && !next
    return (
      <div className={styles.continue}>
        <p className={styles.continueSummary}>
          {allSolved
            ? `You have solved all ${count.total} challenges. Try them again any time, or take a quiz.`
            : `${CHALLENGES.length} challenges to solve: ${describeChallengeLevels()}. Each one checks your query's result automatically.`}
        </p>
        {!allSolved && (
          <>
            <p className={styles.continueLesson}>Start here: {first.title}</p>
            <p className={styles.continueSummary}>{first.summary}</p>
          </>
        )}
        <div className={styles.buttons}>
          {!allSolved && (
            <Button to={challengePath(first.id)} variant="secondary">
              Start the first challenge
            </Button>
          )}
          <Link to={NAV.challenges.path} className={styles.moduleLink}>
            Browse all challenges
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.continue}>
      <p className={styles.continueModule}>
        {count.done} of {count.total} solved
      </p>
      <p className={styles.continueLesson}>Up next: {next.title}</p>
      <p className={styles.continueSummary}>{next.summary}</p>
      <div className={styles.buttons}>
        <Button to={challengePath(next.id)} variant="secondary">
          Continue with challenges
        </Button>
        <Link to={`${NAV.challenges.path}?status=unsolved`} className={styles.moduleLink}>
          See unsolved challenges
        </Link>
      </div>
    </div>
  )
}

/**
 * The lesson to open next: the last lesson opened if it is not complete yet,
 * otherwise the first incomplete lesson in the course.
 */
function ContinueLearning({ progress }: { progress: ProgressData }) {
  const last = recallLastLesson()
  const resume = last && !isLessonComplete(progress, last.module.id, last.lesson.id) ? last : undefined
  const upcoming = nextIncompleteLesson(MODULES, progress)
  const target = resume ?? (upcoming && findLesson(upcoming.module.id, upcoming.lessonId))

  // A newcomer: nothing opened and nothing completed yet.
  if (!last && Object.keys(progress.lessons).length === 0) {
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
          ? `Begin with "${first.lesson.title}" in ${first.module.title}. After that, your next lesson will appear here.`
          : 'Lessons will appear here once they are added.'}
      </EmptyState>
    )
  }

  if (!target) {
    return (
      <div className={styles.continue}>
        <p className={styles.continueLesson}>You have completed every lesson</p>
        <p className={styles.continueSummary}>
          Put what you have learned to work in the challenges, or revisit any lesson from Learn SQL.
        </p>
        <div className={styles.buttons}>
          <Button to={NAV.challenges.path} variant="secondary">
            Go to the challenges
          </Button>
          <Link to={NAV.learn.path} className={styles.moduleLink}>
            Review the lessons
          </Link>
        </div>
      </div>
    )
  }

  const { module, lesson, index } = target

  return (
    <div className={styles.continue}>
      <p className={styles.continueModule}>
        {resume ? 'Where you left off' : 'Up next'}: {module.title}, lesson {index + 1} of {module.lessons.length}
      </p>
      <p className={styles.continueLesson}>{lesson.title}</p>
      <p className={styles.continueSummary}>{lesson.summary}</p>
      <Button to={lessonPath(module.id, lesson.id)} variant="secondary">
        {resume ? 'Resume learning' : 'Start the next lesson'}
      </Button>
    </div>
  )
}
