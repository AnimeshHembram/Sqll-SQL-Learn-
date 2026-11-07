import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { ChallengeSolution, ContentModule, ExerciseKind, PathExercise, PathProblem, PathQuiz } from '../../src/content/types.ts'
import { loadChallenges, type WrongAnswer } from './loadChallenges.ts'
import { displayPath, loadContent } from './loadContent.ts'
import { loadQuizzes } from './loadQuizzes.ts'

/**
 * SQL Path chapters, with their exercises and quizzes. Everything is parsed by
 * the existing loaders, so chapters follow the lesson rules (and their examples
 * are checked by npm run check:examples), exercises follow the challenge rules
 * (checked by npm run check:challenges) and quizzes follow the quiz rules.
 *
 *   <root>/chapters/<path-id>/_module.md            the path's chapter collection
 *   <root>/chapters/<path-id>/<nn>-<chapter>.md     one chapter, in lesson format
 *   <root>/exercises/<path-id>/<chapter-id>/<n>-guided-<name>.md
 *   <root>/exercises/<path-id>/<chapter-id>/<n>-independent-<name>.md
 *   <root>/quizzes/<path-id>/<chapter-id>.md        the chapter quiz (quiz id = chapter id)
 *   <root>/problems/<path-id>/day-<nnn>-<name>.md   one daily problem, in challenge format
 *
 * Daily problems must run from Day 1 with no gaps (at most 365), so "Days 1 to N
 * are written" is always true, and every problem's "order" must equal its day.
 *
 * Every chapter needs at least one guided exercise, one independent exercise and a quiz.
 */

export interface PathContentResult {
  /** One module per career path; its lessons are the path's written chapters. */
  modules: ContentModule[]
  exercises: PathExercise[]
  /** Daily problems, by path and then by day. */
  problems: PathProblem[]
  solutions: Record<string, ChallengeSolution>
  wrongAnswers: Record<string, WrongAnswer[]>
  sourceFiles: Record<string, string>
  quizzes: PathQuiz[]
  errors: string[]
  files: string[]
}

const KIND_PATTERN = /^\d+-(guided|independent)-[a-z0-9-]+\.md$/

function folders(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : []
}

export function loadPathContent(root: string, datasetsDir: string, takenChallengeIds: ReadonlySet<string>): PathContentResult {
  const result: PathContentResult = { modules: [], exercises: [], problems: [], solutions: {}, wrongAnswers: {}, sourceFiles: {}, quizzes: [], errors: [], files: [] }
  if (!existsSync(root)) return result

  const chapters = loadContent(path.join(root, 'chapters'), datasetsDir)
  result.modules = chapters.modules
  result.errors.push(...chapters.errors)
  result.files.push(...chapters.files)
  const chapterIds = new Map(chapters.modules.map((module) => [module.id, new Set(module.lessons.map((lesson) => lesson.id))]))

  // --- Exercises ---------------------------------------------------------------------------
  const exercisesRoot = path.join(root, 'exercises')
  for (const pathId of folders(exercisesRoot)) {
    const known = chapterIds.get(pathId)
    if (!known) {
      result.errors.push(`${displayPath(path.join(exercisesRoot, pathId))}: there is no chapter folder for path "${pathId}"`)
      continue
    }
    for (const chapterId of folders(path.join(exercisesRoot, pathId))) {
      const dir = path.join(exercisesRoot, pathId, chapterId)
      if (!known.has(chapterId)) {
        result.errors.push(`${displayPath(dir)}: path "${pathId}" has no chapter "${chapterId}"`)
        continue
      }
      // An exercise's "module" is its path id.
      const loaded = loadChallenges(dir, datasetsDir, new Set([pathId]))
      result.errors.push(...loaded.errors)
      result.files.push(...loaded.files)
      for (const exercise of loaded.challenges) {
        const file = loaded.sourceFiles[exercise.id]
        const match = KIND_PATTERN.exec(path.basename(file))
        if (!match) {
          result.errors.push(`${displayPath(file)}: name exercise files "<n>-guided-<name>.md" or "<n>-independent-<name>.md"`)
          continue
        }
        if (takenChallengeIds.has(exercise.id) || result.solutions[exercise.id]) {
          result.errors.push(`${displayPath(file)}: id "${exercise.id}" is already used by another challenge or exercise`)
          continue
        }
        result.exercises.push({ ...exercise, pathId, chapterId, kind: match[1] as ExerciseKind })
        result.solutions[exercise.id] = loaded.solutions[exercise.id]
        result.wrongAnswers[exercise.id] = loaded.wrongAnswers[exercise.id] ?? []
        result.sourceFiles[exercise.id] = file
      }
    }
  }

  // --- Quizzes -------------------------------------------------------------------------------
  const quizzesRoot = path.join(root, 'quizzes')
  for (const pathId of folders(quizzesRoot)) {
    const known = chapterIds.get(pathId)
    const loaded = loadQuizzes(path.join(quizzesRoot, pathId))
    result.errors.push(...loaded.errors)
    result.files.push(...loaded.files)
    for (const quiz of loaded.quizzes) {
      if (!known?.has(quiz.id)) result.errors.push(`quiz "${quiz.id}" in ${displayPath(path.join(quizzesRoot, pathId))}: path "${pathId}" has no chapter with that id`)
      else result.quizzes.push({ ...quiz, pathId })
    }
  }

  // --- Daily problems ------------------------------------------------------------------------
  const problemsRoot = path.join(root, 'problems')
  for (const pathId of folders(problemsRoot)) {
    const dir = path.join(problemsRoot, pathId)
    if (!chapterIds.has(pathId)) {
      result.errors.push(`${displayPath(dir)}: there is no chapter folder for path "${pathId}"`)
      continue
    }
    const loaded = loadChallenges(dir, datasetsDir, new Set([pathId]))
    result.errors.push(...loaded.errors)
    result.files.push(...loaded.files)
    const days: number[] = []
    for (const problem of loaded.challenges) {
      const file = loaded.sourceFiles[problem.id]
      const match = /^day-(\d{3})-[a-z0-9-]+\.md$/.exec(path.basename(file))
      const day = match ? Number(match[1]) : NaN
      if (!match || day < 1 || day > 365) {
        result.errors.push(`${displayPath(file)}: name daily problems "day-<001 to 365>-<name>.md"`)
        continue
      }
      if (problem.order !== day) result.errors.push(`${displayPath(file)}: "order" is ${problem.order}, but the file is Day ${day}`)
      if (takenChallengeIds.has(problem.id) || result.solutions[problem.id]) {
        result.errors.push(`${displayPath(file)}: id "${problem.id}" is already used by another challenge, exercise or problem`)
        continue
      }
      days.push(day)
      result.problems.push({ ...problem, pathId, day })
      result.solutions[problem.id] = loaded.solutions[problem.id]
      result.wrongAnswers[problem.id] = loaded.wrongAnswers[problem.id] ?? []
      result.sourceFiles[problem.id] = file
    }
    days.sort((a, b) => a - b)
    days.forEach((day, index) => {
      if (day !== index + 1) result.errors.push(`${displayPath(dir)}: daily problems must run from Day 1 without gaps; Day ${index + 1} is missing or repeated`)
    })
  }
  result.problems.sort((a, b) => a.pathId.localeCompare(b.pathId) || a.day - b.day)

  // --- Every chapter is complete ---------------------------------------------------------------
  for (const module of chapters.modules) {
    for (const lesson of module.lessons) {
      const exercises = result.exercises.filter((exercise) => exercise.pathId === module.id && exercise.chapterId === lesson.id)
      const where = `chapter "${module.id}/${lesson.id}"`
      if (!exercises.some((exercise) => exercise.kind === 'guided')) result.errors.push(`${where} needs at least one guided exercise`)
      if (!exercises.some((exercise) => exercise.kind === 'independent')) result.errors.push(`${where} needs at least one independent exercise`)
      if (!result.quizzes.some((quiz) => quiz.pathId === module.id && quiz.id === lesson.id)) result.errors.push(`${where} needs a quiz`)
    }
  }

  // Exercises in chapter order, then guided before independent, then by their own order.
  const chapterOrder = (exercise: PathExercise) =>
    chapters.modules.find((module) => module.id === exercise.pathId)?.lessons.findIndex((lesson) => lesson.id === exercise.chapterId) ?? 0
  result.exercises.sort(
    (a, b) =>
      a.pathId.localeCompare(b.pathId) ||
      chapterOrder(a) - chapterOrder(b) ||
      Number(a.kind === 'independent') - Number(b.kind === 'independent') ||
      a.order - b.order,
  )
  return result
}
