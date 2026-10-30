import { challenges, quizzes } from 'virtual:sql-learner-content'
import { NAV } from '../app/navigation.ts'
import { LEVELS, type ChallengeSolution, type ContentChallenge, type ContentQuiz, type Level } from './types.ts'

export type { ChallengeSolution, ContentChallenge, ContentQuiz, QuizQuestion } from './types.ts'

/** Every challenge, in list order. Validated at build time by plugins/content; never includes solutions. */
export const CHALLENGES = challenges as readonly ContentChallenge[]

/** Every quiz, in list order. */
export const QUIZZES = quizzes as readonly ContentQuiz[]

/** Topics in the order they first appear, which follows the learning path. */
export const CHALLENGE_TOPICS: readonly string[] = [...new Set(CHALLENGES.map((challenge) => challenge.topic))]

export function isLevel(value: string | null): value is Level {
  return value !== null && (LEVELS as readonly string[]).includes(value)
}

export interface ChallengeLocation {
  challenge: ContentChallenge
  /** Zero-based position in the list. */
  index: number
  previous?: ContentChallenge
  next?: ContentChallenge
}

export function findChallenge(challengeId: string): ChallengeLocation | undefined {
  const index = CHALLENGES.findIndex((challenge) => challenge.id === challengeId)
  if (index === -1) return undefined
  return { challenge: CHALLENGES[index], index, previous: CHALLENGES[index - 1], next: CHALLENGES[index + 1] }
}

export function findQuiz(quizId: string): ContentQuiz | undefined {
  return QUIZZES.find((quiz) => quiz.id === quizId)
}

export function challengePath(challengeId: string): string {
  return `${NAV.challenges.path}/${challengeId}`
}

export function quizPath(quizId: string): string {
  return `${NAV.quizzes.path}/${quizId}`
}

/** The first beginner challenge, the suggested starting point. */
export function firstBeginnerChallenge(): ContentChallenge | undefined {
  return CHALLENGES.find((challenge) => challenge.difficulty === 'beginner') ?? CHALLENGES[0]
}

/** For example "5 beginner, 5 intermediate and 5 advanced". Only levels that have challenges are listed. */
export function describeChallengeLevels(): string {
  const parts = LEVELS.flatMap((level) => {
    const count = CHALLENGES.filter((challenge) => challenge.difficulty === level).length
    return count > 0 ? [`${count} ${level}`] : []
  })
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? '')
}

/**
 * Loads a challenge's solution, expected result and explanation. They are in a
 * separate chunk that is only downloaded when the learner asks to see a solution.
 */
export async function loadSolution(challengeId: string): Promise<ChallengeSolution | undefined> {
  const { solutions } = await import('virtual:sql-learner-challenge-solutions')
  return (solutions as Record<string, ChallengeSolution | undefined>)[challengeId]
}
