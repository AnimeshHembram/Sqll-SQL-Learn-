import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { DifficultyBadge } from '../components/challenges/DifficultyBadge.tsx'
import { Tag } from '../components/challenges/Tag.tsx'
import { Prose } from '../components/content/Prose.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { QUIZZES, findQuiz, quizPath, type ContentQuiz, type QuizQuestion } from '../content/challenges.ts'
import type { QuestionType } from '../content/types.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './QuizPage.module.css'

const TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple choice',
  'predict-output': 'Predict the output',
  'find-the-error': 'Find the incorrect query',
  'choose-the-clause': 'Choose the clause',
  conceptual: 'Concept check',
}

interface Answer {
  selected: number | null
  checked: boolean
}

export function QuizPage() {
  const { quizId = '' } = useParams()
  const quiz = findQuiz(quizId)
  if (!quiz) return <NotFoundPage />
  return <QuizRunner key={quiz.id} quiz={quiz} />
}

/** Answers live in this component only: leaving the page or reloading starts the quiz again. */
function QuizRunner({ quiz }: { quiz: ContentQuiz }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [attempt, setAttempt] = useState(0)

  const answerOf = (question: QuizQuestion): Answer => answers[question.id] ?? { selected: null, checked: false }
  const update = (question: QuizQuestion, patch: Partial<Answer>) =>
    setAnswers((current) => ({ ...current, [question.id]: { ...answerOf(question), ...patch } }))

  const checked = quiz.questions.filter((question) => answerOf(question).checked)
  const correct = checked.filter((question) => answerOf(question).selected === question.correctIndex)
  const finished = checked.length === quiz.questions.length
  const nextQuiz = QUIZZES[QUIZZES.findIndex((item) => item.id === quiz.id) + 1]

  const restart = () => {
    setAnswers({})
    setAttempt((value) => value + 1)
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <Breadcrumbs items={[{ label: NAV.quizzes.label, to: NAV.quizzes.path }]} />
      <PageHeader
        title={quiz.title}
        description={quiz.summary}
        meta={`${quiz.questions.length} questions. About ${quiz.durationMinutes} minutes. Choose an answer, then check it to see the explanation. Nothing is saved.`}
      />
      <p className={styles.tags}>
        <DifficultyBadge level={quiz.difficulty} />
        <Tag>
          <span className="visually-hidden">Topics: </span>
          {quiz.topic}
        </Tag>
      </p>

      <ol className={styles.questions}>
        {quiz.questions.map((question, index) => (
          <li key={`${attempt}-${question.id}`}>
            <QuestionCard
              question={question}
              number={index + 1}
              total={quiz.questions.length}
              answer={answerOf(question)}
              onSelect={(selected) => update(question, { selected })}
              onCheck={() => update(question, { checked: true })}
            />
          </li>
        ))}
      </ol>

      <Card title="Your answers">
        <p className={styles.summary} role="status">
          {finished
            ? `You answered ${correct.length} of ${quiz.questions.length} questions correctly.`
            : checked.length === 0
              ? `You have not checked any answers yet. ${quiz.questions.length} questions to go.`
              : `${checked.length} of ${quiz.questions.length} answers checked, ${correct.length} correct so far.`}
        </p>
        {finished && (
          <p className={styles.note}>
            {correct.length === quiz.questions.length
              ? 'Every answer was right. Put it into practice with a challenge.'
              : 'Read the explanations for the questions you missed, then try the quiz again.'}
          </p>
        )}
        <div className={styles.actions}>
          {checked.length > 0 && (
            <Button variant="secondary" onClick={restart}>
              Start again
            </Button>
          )}
          {finished && nextQuiz && <Button to={quizPath(nextQuiz.id)}>Next quiz: {nextQuiz.title}</Button>}
          {finished && !nextQuiz && <Button to={NAV.challenges.path}>Try the challenges</Button>}
        </div>
      </Card>

      <p className={styles.back}>
        <Link to={NAV.quizzes.path}>All quizzes</Link>
      </p>
    </>
  )
}

interface QuestionCardProps {
  question: QuizQuestion
  number: number
  total: number
  answer: Answer
  onSelect: (index: number) => void
  onCheck: () => void
}

function QuestionCard({ question, number, total, answer, onSelect, onCheck }: QuestionCardProps) {
  const name = `question-${question.id}`
  const isCorrect = answer.checked && answer.selected === question.correctIndex

  return (
    <fieldset className={styles.question} data-question={question.id}>
      <legend className={styles.legend}>
        <span className={styles.position}>
          Question {number} of {total}
        </span>
        {/* Question, prompt and option HTML is built from the quiz's Markdown, which the build checks for unsafe content. */}
        <span className={styles.text} dangerouslySetInnerHTML={{ __html: question.questionHtml }} />
      </legend>
      <p className={styles.questionTags}>
        <Tag>{TYPE_LABELS[question.type]}</Tag>
        <Tag>
          <span className="visually-hidden">Topic: </span>
          {question.topic}
        </Tag>
      </p>

      {question.promptHtml.trim() !== '' && (
        <div className={styles.prompt}>
          <Prose html={question.promptHtml} />
        </div>
      )}

      <div className={styles.options}>
        {question.options.map((option, index) => {
          const state = !answer.checked
            ? undefined
            : index === question.correctIndex
              ? 'correct'
              : index === answer.selected
                ? 'wrong'
                : undefined
          return (
            <label key={index} className={styles.option} data-state={state}>
              <input
                type="radio"
                name={name}
                value={index}
                checked={answer.selected === index}
                disabled={answer.checked}
                onChange={() => onSelect(index)}
              />
              <span dangerouslySetInnerHTML={{ __html: option.html }} />
              {state === 'correct' && <span className={styles.marker}>Correct answer</span>}
              {state === 'wrong' && <span className={styles.marker}>Your answer</span>}
            </label>
          )
        })}
      </div>

      {!answer.checked && (
        <Button variant="secondary" onClick={onCheck} disabled={answer.selected === null}>
          Check answer<span className="visually-hidden"> to question {number}</span>
        </Button>
      )}

      <div aria-live="polite">
        {answer.checked && (
          <div className={isCorrect ? styles.right : styles.wrongResult}>
            <p className={styles.verdict}>
              <span aria-hidden="true">{isCorrect ? '✓ ' : '✗ '}</span>
              {isCorrect ? 'Correct.' : 'Not quite. The correct answer is marked above.'}
            </p>
            <Prose html={question.explanationHtml} />
          </div>
        )}
      </div>
    </fieldset>
  )
}
