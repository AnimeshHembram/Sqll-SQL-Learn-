import { pathExercises, pathModules, pathProblems, pathQuizzes } from 'virtual:sql-learner-path-content'
import { lessonPath } from '../index.ts'
import type { ContentLesson, ContentModule, PathExercise, PathProblem, PathQuiz } from '../types.ts'
import { pathUrl, type CareerPath, type PathChapter } from './catalog.ts'
import type { PathRecord } from '../../features/paths/pathModel.ts'
import type { PathContext } from '../../features/paths/pathSummary.ts'

/**
 * Written SQL Path chapters, with their exercises and quizzes. Built from
 * src/content/paths-content by plugins/content and loaded only with the SQL Path
 * pages, so the rest of the app does not download them.
 */

const MODULES = pathModules as readonly ContentModule[]
const EXERCISES = pathExercises as readonly PathExercise[]
const QUIZZES = pathQuizzes as readonly PathQuiz[]
const PROBLEMS = pathProblems as readonly PathProblem[]

export function findChapterContent(pathId: string, chapterId: string): ContentLesson | undefined {
  return MODULES.find((module) => module.id === pathId)?.lessons.find((lesson) => lesson.id === chapterId)
}

export function chapterExercises(pathId: string, chapterId: string): readonly PathExercise[] {
  return EXERCISES.filter((exercise) => exercise.pathId === pathId && exercise.chapterId === chapterId)
}

export function chapterQuiz(pathId: string, chapterId: string): PathQuiz | undefined {
  return QUIZZES.find((quiz) => quiz.pathId === pathId && quiz.id === chapterId)
}

export function chapterUrl(pathId: string, chapterId: string): string {
  return `${pathUrl(pathId)}/${chapterId}`
}

/** Everything the progress calculations need to know about a path's written chapters. */
export function pathContext(pathId: string, record: PathRecord | undefined): PathContext {
  return {
    record,
    isWritten: (chapterId) => Boolean(findChapterContent(pathId, chapterId)),
    exerciseIds: (chapterId) => chapterExercises(pathId, chapterId).map((exercise) => exercise.id),
    quizSize: (chapterId) => chapterQuiz(pathId, chapterId)?.questions.length ?? 0,
  }
}

/** Where a chapter is read: its own page if written, otherwise its first Learn SQL lesson. Undefined for a planned chapter. */
export function chapterLink(path: CareerPath, chapter: PathChapter): string | undefined {
  if (findChapterContent(path.id, chapter.id)) return chapterUrl(path.id, chapter.id)
  const first = chapter.lessons[0]
  return first ? lessonPath(first.moduleId, first.lessonId) : undefined
}

// --- Daily problems ----------------------------------------------------------------------

/** A path's written daily problems, Day 1 first. Days run without gaps, so the list's length is the last written day. */
export function pathProblemList(pathId: string): readonly PathProblem[] {
  return PROBLEMS.filter((problem) => problem.pathId === pathId)
}

export function findProblem(pathId: string, day: number): PathProblem | undefined {
  return PROBLEMS.find((problem) => problem.pathId === pathId && problem.day === day)
}

export function problemsUrl(pathId: string): string {
  return `${pathUrl(pathId)}/problems`
}

export function problemUrl(pathId: string, day: number): string {
  return `${problemsUrl(pathId)}/${day}`
}
