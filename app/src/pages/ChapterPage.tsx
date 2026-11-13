import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonBody } from '../components/content/LessonBody.tsx'
import { ExerciseCard } from '../components/paths/ExerciseCard.tsx'
import { formatDate } from '../components/progress/format.ts'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { findPath, pathUrl, type CareerPath, type PathChapter } from '../content/paths/catalog.ts'
import { chapterExercises, chapterLink, chapterQuiz, findChapterContent, pathContext } from '../content/paths/chapters.ts'
import type { ContentLesson, PathQuiz, QuizQuestion } from '../content/types.ts'
import { completePathChapter, recordPathChapterQuiz, usePathProgress } from '../features/paths/pathStore.ts'
import { chapterPosition, chapterRequirements, chapterStatus, quizPassMark } from '../features/paths/pathSummary.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import type { TableInfo } from '../features/sql/protocol.ts'
import { challengeEngine } from '../features/sql/sqlEngine.ts'
import { useSqlEngine } from '../features/sql/useSqlEngine.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import { QuestionCard, type Answer } from './QuizPage.tsx'
import styles from './ChapterPage.module.css'
import { PathContentGate } from '../components/paths/PathContentGate.tsx'

/** The page, once the path's content is loaded (PathContentGate). */
export function ChapterPage() {
  return (
    <PathContentGate>
      <ChapterPageContent />
    </PathContentGate>
  )
}

function ChapterPageContent() {
  const { pathId = '', chapterId = '' } = useParams()
  const path = findPath(pathId)
  const content = path ? findChapterContent(path.id, chapterId) : undefined
  const quiz = path ? chapterQuiz(path.id, chapterId) : undefined
  if (!path || !content || !quiz) return <NotFoundPage />
  // A new key per chapter, so moving to the next chapter starts with fresh page state.
  return <ChapterView key={`${path.id}/${content.id}`} path={path} content={content} quiz={quiz} />
}

function ChapterView({ path, content, quiz }: { path: CareerPath; content: ContentLesson; quiz: PathQuiz }) {
  const progress = useProgress()
  const record = usePathProgress().paths[path.id]
  const context = pathContext(path.id, record)
  const position = chapterPosition(path, content.id)
  const exercises = chapterExercises(path.id, content.id)
  const guided = exercises.filter((exercise) => exercise.kind === 'guided')
  const independent = exercises.filter((exercise) => exercise.kind === 'independent')
  const requirements = chapterRequirements(content.id, context)
  const completedAt = record?.chapters[content.id]?.completedAt
  const engine = useSqlEngine(challengeEngine)
  const [tables, setTables] = useState<TableInfo[] | null>(null)
  const engineUsable = engine.sqliteVersion !== null && engine.status !== 'failed'

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

  // Neighbouring chapters that can be opened (planned chapters have no page yet).
  const allChapters = path.stages.flatMap((stage) => stage.chapters)
  const index = allChapters.findIndex((chapter) => chapter.id === content.id)
  const previous = [...allChapters.slice(0, index)].reverse().find((chapter) => chapterLink(path, chapter))
  const next = allChapters.slice(index + 1).find((chapter) => chapterLink(path, chapter))
  const nextPlanned = allChapters.slice(index + 1).find((chapter) => chapterStatus(chapter, progress, context).state === 'planned')

  const steps = { done: requirements.exercises.done + (requirements.quiz.passed ? 1 : 0), total: requirements.exercises.total + 1 }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.paths.label, to: NAV.paths.path },
          { label: path.title, to: pathUrl(path.id) },
        ]}
      />
      <PageHeader
        title={content.title}
        documentTitle={`${content.title} · ${path.title}`}
        description={content.summary}
        meta={
          position
            ? `Stage ${position.stageIndex + 1}: ${position.stage.title}. Chapter ${position.index + 1} of ${position.total}. About ${content.durationMinutes} minutes.`
            : undefined
        }
      />

      <section className={styles.progress} aria-label="Chapter progress">
        <div className={styles.progressText}>
          <p>
            {completedAt
              ? `Chapter complete since ${formatDate(completedAt)}.`
              : `${steps.done} of ${steps.total} steps done: ${requirements.exercises.done} of ${requirements.exercises.total} exercises solved, quiz ${requirements.quiz.passed ? 'passed' : 'not passed yet'}.`}
          </p>
          <ProgressBar done={completedAt ? steps.total : steps.done} total={steps.total} label={`${content.title} steps done`} />
        </div>
      </section>

      <Card title="In this chapter you will" className={styles.objectives}>
        <ul className={styles.bullets}>
          {content.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
        <p className={styles.howTo}>
          Read each section and press <strong>Run</strong> under the examples to see real results. Then do the guided exercises,
          which give you a starting query and steps, and the independent exercises, which leave the query to you. Finish with the
          quiz.
        </p>
      </Card>

      <div className={styles.body}>
        <LessonBody lesson={content} />
      </div>

      <section className={styles.section} aria-labelledby="guided-exercises">
        <h2 id="guided-exercises" className={styles.sectionTitle}>
          Guided exercises
        </h2>
        <p className={styles.sectionNote}>Each one starts with part of the query and tells you what to add.</p>
        <div className={styles.exercises}>
          {guided.map((exercise, number) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              label={`Guided exercise ${number + 1}`}
              saved={record?.exercises[exercise.id]}
              schema={schema}
              engineFailed={engine.status === 'failed'}
            />
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="independent-exercises">
        <h2 id="independent-exercises" className={styles.sectionTitle}>
          Independent exercises
        </h2>
        <p className={styles.sectionNote}>Write these queries yourself. Hints are there if you get stuck.</p>
        <div className={styles.exercises}>
          {independent.map((exercise, number) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              label={`Independent exercise ${number + 1}`}
              saved={record?.exercises[exercise.id]}
              schema={schema}
              engineFailed={engine.status === 'failed'}
            />
          ))}
        </div>
      </section>
      {engine.status === 'failed' && (
        <div className={styles.failure} role="alert">
          <p>{engine.failure}</p>
          <Button variant="secondary" onClick={() => void challengeEngine.retry().catch(() => undefined)}>
            Try again
          </Button>
        </div>
      )}

      <ChapterQuiz path={path} quiz={quiz} />

      <CompleteChapter
        path={path}
        chapterId={content.id}
        completedAt={completedAt}
        requirements={requirements}
        next={next}
      />

      <nav className={styles.pager} aria-label="Chapter navigation">
        {previous ? (
          <ChapterLink path={path} chapter={previous} direction="Previous chapter" />
        ) : (
          <span />
        )}
        <Link to={pathUrl(path.id)} className={styles.allLink}>
          {path.title} roadmap
        </Link>
        {next ? (
          <ChapterLink path={path} chapter={next} direction="Next chapter" />
        ) : (
          <span className={styles.pagerNote}>{nextPlanned ? `Next: ${nextPlanned.title} (planned)` : ''}</span>
        )}
      </nav>
    </>
  )
}

function ChapterLink({ path, chapter, direction }: { path: CareerPath; chapter: PathChapter; direction: string }) {
  const to = chapterLink(path, chapter)
  if (!to) return null
  return (
    <Link to={to} className={styles.pagerLink} data-direction={direction}>
      <span className={styles.pagerLabel}>{direction}</span>
      {chapter.title}
    </Link>
  )
}

/** The chapter quiz. Answers live in this component; the score is saved in the path's record when every answer is checked. */
function ChapterQuiz({ path, quiz }: { path: CareerPath; quiz: PathQuiz }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [attempt, setAttempt] = useState(0)
  const saved = usePathProgress().paths[path.id]?.quizzes[quiz.id]
  const startRef = useRef<HTMLHeadingElement>(null)

  const answerOf = (question: QuizQuestion): Answer => answers[question.id] ?? { selected: null, checked: false }
  const check = (question: QuizQuestion) => {
    const after = { ...answers, [question.id]: { ...answerOf(question), checked: true } }
    setAnswers(after)
    if (quiz.questions.every((item) => after[item.id]?.checked)) {
      const score = quiz.questions.filter((item) => after[item.id]?.selected === item.correctIndex).length
      recordPathChapterQuiz(path.id, quiz.id, score, quiz.questions.length)
    }
  }
  const checked = quiz.questions.filter((question) => answerOf(question).checked)
  const correct = checked.filter((question) => answerOf(question).selected === question.correctIndex)
  const finished = checked.length === quiz.questions.length
  const passMark = quizPassMark(quiz.questions.length)

  return (
    <section className={styles.section} aria-labelledby="chapter-quiz">
      <h2 id="chapter-quiz" ref={startRef} tabIndex={-1} className={styles.sectionTitle}>
        Chapter quiz
      </h2>
      <p className={styles.sectionNote}>
        {quiz.questions.length} questions. Check each answer to see why it is right or wrong. Get {passMark} or more right to pass;
        your best score is saved.
      </p>
      <ol className={styles.questions}>
        {quiz.questions.map((question, number) => (
          <li key={`${attempt}-${question.id}`}>
            <QuestionCard
              question={question}
              number={number + 1}
              total={quiz.questions.length}
              answer={answerOf(question)}
              onSelect={(selected) => setAnswers((current) => ({ ...current, [question.id]: { ...answerOf(question), selected } }))}
              onCheck={() => check(question)}
            />
          </li>
        ))}
      </ol>
      <div className={styles.quizSummary}>
        <p role="status">
          {finished
            ? `You answered ${correct.length} of ${quiz.questions.length} correctly. ${correct.length >= passMark ? 'Quiz passed.' : `You need ${passMark} to pass: read the explanations and try again.`}`
            : `${checked.length} of ${quiz.questions.length} answers checked.`}
        </p>
        {saved && (
          <p className={styles.sectionNote}>
            Best score: {saved.bestScore} of {saved.total}, from {saved.attempts} {saved.attempts === 1 ? 'attempt' : 'attempts'}.
          </p>
        )}
        {checked.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              setAnswers({})
              setAttempt((value) => value + 1)
              startRef.current?.scrollIntoView({ block: 'start' })
              startRef.current?.focus({ preventScroll: true })
            }}
          >
            Start the quiz again
          </Button>
        )}
      </div>
    </section>
  )
}

interface CompleteChapterProps {
  path: CareerPath
  chapterId: string
  completedAt: string | undefined
  requirements: ReturnType<typeof chapterRequirements>
  next: PathChapter | undefined
}

/** The chapter can be completed only when every exercise is solved and the quiz is passed. */
function CompleteChapter({ path, chapterId, completedAt, requirements, next }: CompleteChapterProps) {
  const [message, setMessage] = useState('')
  const messageRef = useRef<HTMLParagraphElement>(null)
  const { exercises, quiz } = requirements
  const nextTo = next ? chapterLink(path, next) : undefined

  return (
    <Card title="Complete this chapter" className={styles.complete}>
      <ul className={styles.checklist}>
        <li data-done={exercises.done === exercises.total || undefined}>
          {exercises.done === exercises.total ? '✓ ' : ''}Solve every exercise: {exercises.done} of {exercises.total} solved
        </li>
        <li data-done={quiz.passed || undefined}>
          {quiz.passed ? '✓ ' : ''}Pass the quiz ({quiz.passMark} of {quiz.total} correct):{' '}
          {quiz.best === null ? 'not taken yet' : `best score ${quiz.best} of ${quiz.total}`}
        </li>
      </ul>
      {completedAt ? (
        <p className={styles.completed}>✓ You completed this chapter on {formatDate(completedAt)}.</p>
      ) : requirements.met ? (
        <Button
          onClick={() => {
            const saved = completePathChapter(path.id, chapterId)
            setMessage(saved ? 'Chapter complete. It now counts towards your path progress.' : 'Chapter complete for this visit. This browser is blocking storage, so it will not be remembered.')
            requestAnimationFrame(() => messageRef.current?.focus())
          }}
        >
          Complete chapter
        </Button>
      ) : (
        <p className={styles.sectionNote}>Finish both steps above to complete the chapter. Until then it does not count as complete.</p>
      )}
      <p ref={messageRef} tabIndex={-1} role="status" className={styles.message}>
        {message}
      </p>
      {completedAt && nextTo && next && <Button to={nextTo}>Next chapter: {next.title}</Button>}
    </Card>
  )
}
