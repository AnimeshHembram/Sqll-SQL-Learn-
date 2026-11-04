/**
 * Progress measured against the course content: what is complete, what comes
 * next. Content is passed in rather than imported, so these functions stay pure
 * and are tested in Node. Saved entries for content that no longer exists are
 * ignored, so removing a lesson never produces counts such as "6 of 5".
 */

import { LEVELS, type ContentChallenge, type ContentModule, type ContentQuiz, type Level } from '../../content/types.ts'
import { lessonKey, type ProgressData } from './progressModel.ts'

export interface Count {
  done: number
  total: number
}

export function percent({ done, total }: Count): number {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

export function isLessonComplete(progress: ProgressData, moduleId: string, lessonId: string): boolean {
  return lessonKey(moduleId, lessonId) in progress.lessons
}

export function isChallengeSolved(progress: ProgressData, challengeId: string): boolean {
  return Boolean(progress.challenges[challengeId]?.solvedAt)
}

export function moduleCount(module: ContentModule, progress: ProgressData): Count {
  return {
    done: module.lessons.filter((lesson) => isLessonComplete(progress, module.id, lesson.id)).length,
    total: module.lessons.length,
  }
}

export function lessonCount(modules: readonly ContentModule[], progress: ProgressData): Count {
  return modules.reduce(
    (sum, module) => {
      const { done, total } = moduleCount(module, progress)
      return { done: sum.done + done, total: sum.total + total }
    },
    { done: 0, total: 0 },
  )
}

/** The first lesson in course order that is not complete. */
export function nextIncompleteLesson(
  modules: readonly ContentModule[],
  progress: ProgressData,
): { module: ContentModule; lessonId: string } | undefined {
  for (const module of modules) {
    const lesson = module.lessons.find((item) => !isLessonComplete(progress, module.id, item.id))
    if (lesson) return { module, lessonId: lesson.id }
  }
  return undefined
}

export interface ChallengeCount extends Count {
  byLevel: Record<Level, Count>
}

export function challengeCount(challenges: readonly ContentChallenge[], progress: ProgressData): ChallengeCount {
  const byLevel = Object.fromEntries(LEVELS.map((level) => [level, { done: 0, total: 0 }])) as Record<Level, Count>
  let done = 0
  for (const challenge of challenges) {
    const solved = isChallengeSolved(progress, challenge.id)
    byLevel[challenge.difficulty].total += 1
    if (solved) {
      byLevel[challenge.difficulty].done += 1
      done += 1
    }
  }
  return { done, total: challenges.length, byLevel }
}

/** The first unsolved challenge in list order (which follows the learning path). */
export function nextUnsolvedChallenge(
  challenges: readonly ContentChallenge[],
  progress: ProgressData,
): ContentChallenge | undefined {
  return challenges.find((challenge) => !isChallengeSolved(progress, challenge.id))
}

export interface QuizCount extends Count {
  /** Average of best scores, as a percentage, over finished quizzes. Null when none are finished. */
  averageBest: number | null
}

export function quizCount(quizzes: readonly ContentQuiz[], progress: ProgressData): QuizCount {
  const finished = quizzes.flatMap((quiz) => {
    const result = progress.quizzes[quiz.id]
    return result ? [result.bestScore / result.total] : []
  })
  return {
    done: finished.length,
    total: quizzes.length,
    averageBest: finished.length === 0 ? null : Math.round((finished.reduce((a, b) => a + b, 0) / finished.length) * 100),
  }
}
