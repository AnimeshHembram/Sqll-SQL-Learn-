import { useId } from 'react'
import { CHALLENGES, QUIZZES } from '../../content/challenges.ts'
import { MODULES, formatLevel } from '../../content/index.ts'
import { LEVELS } from '../../content/types.ts'
import { summarizeStreak, type ProgressData } from '../../features/progress/progressModel.ts'
import { challengeCount, lessonCount, percent, quizCount } from '../../features/progress/progressSummary.ts'
import { Icon } from '../ui/Icon.tsx'
import { ProgressBar } from '../ui/ProgressBar.tsx'
import { ActivityStrip } from './ActivityStrip.tsx'
import { plural } from './format.ts'
import styles from './ProgressOverview.module.css'

interface ProgressOverviewProps {
  progress: ProgressData
  now: Date
}

/** Lessons, challenges, quizzes and the learning streak, measured against the course content. */
export function ProgressOverview({ progress, now }: ProgressOverviewProps) {
  const lessons = lessonCount(MODULES, progress)
  const challenges = challengeCount(CHALLENGES, progress)
  const quizzes = quizCount(QUIZZES, progress)
  const streak = summarizeStreak(progress.activity, now)
  const id = useId()

  return (
    <div className={styles.grid}>
      <section className={styles.tile} aria-labelledby={`${id}-lessons`}>
        <h3 id={`${id}-lessons`} className={styles.label}>
          Lessons completed
        </h3>
        <p className={styles.value}>
          {lessons.done}
          <span className={styles.of}> of {lessons.total}</span>
        </p>
        <ProgressBar done={lessons.done} total={lessons.total} label="Lessons completed" />
        <p className={styles.detail}>{percent(lessons)}% of the course</p>
      </section>

      <section className={styles.tile} aria-labelledby={`${id}-challenges`}>
        <h3 id={`${id}-challenges`} className={styles.label}>
          Challenges solved
        </h3>
        <p className={styles.value}>
          {challenges.done}
          <span className={styles.of}> of {challenges.total}</span>
        </p>
        <ProgressBar done={challenges.done} total={challenges.total} label="Challenges solved" />
        <p className={styles.detail}>
          {LEVELS.filter((level) => challenges.byLevel[level].total > 0)
            .map((level) => `${formatLevel(level)} ${challenges.byLevel[level].done}/${challenges.byLevel[level].total}`)
            .join(' · ')}
        </p>
      </section>

      <section className={styles.tile} aria-labelledby={`${id}-quizzes`}>
        <h3 id={`${id}-quizzes`} className={styles.label}>
          Quizzes finished
        </h3>
        <p className={styles.value}>
          {quizzes.done}
          <span className={styles.of}> of {quizzes.total}</span>
        </p>
        <ProgressBar done={quizzes.done} total={quizzes.total} label="Quizzes finished" />
        <p className={styles.detail}>
          {quizzes.averageBest === null ? 'No scores yet' : `Average best score ${quizzes.averageBest}%`}
        </p>
      </section>

      <section className={styles.tile} aria-labelledby={`${id}-streak`}>
        <h3 id={`${id}-streak`} className={styles.label}>
          Learning streak
        </h3>
        <p className={styles.value}>
          <span className={streak.current > 0 ? styles.flameOn : styles.flameOff}>
            <Icon name="flame" size={22} />
          </span>
          {plural(streak.current, 'day')}
        </p>
        <p className={styles.detail}>
          {streak.current === 0
            ? 'Complete a lesson, run a query or answer a quiz to start one.'
            : streak.activeToday
              ? `You have learned today. Longest streak: ${plural(streak.longest, 'day')}.`
              : `Learn something today to keep it going. Longest: ${plural(streak.longest, 'day')}.`}
        </p>
        <ActivityStrip activity={progress.activity} now={now} />
      </section>
    </div>
  )
}
