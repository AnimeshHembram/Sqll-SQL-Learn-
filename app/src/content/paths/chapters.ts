import { pathContentLoaders, pathIndex, pathProblemLoaders } from 'virtual:sql-learner-path-content'
import { lessonPath } from '../index.ts'
import type { ContentLesson, ContentModule, PathExercise, PathProblemSummary, PathProjectSummary, PathQuiz } from '../types.ts'
import { pathUrl, type CareerPath, type PathChapter } from './catalog.ts'
import type { PathRecord } from '../../features/paths/pathModel.ts'
import type { PathContext } from '../../features/paths/pathSummary.ts'

/**
 * Written SQL Path chapters, with their exercises and quizzes, project summaries and daily-problem
 * summaries. Built from src/content/paths-content by plugins/content and split by career path
 * (plugins/content/pathContent.ts): every SQL Path page gets a small index, a path's chapter and
 * project pages load that path's content, and its problem pages load its problem list, before they
 * render (see PathContentGate). The functions below read what is already loaded; for a part not
 * loaded yet they find nothing.
 */

/** "content": chapters, exercises, quizzes and project summaries. "problems": daily-problem summaries. */
export type PathPart = 'content' | 'problems'

interface PathContentData {
  pathModules: ContentModule[]
  pathExercises: PathExercise[]
  pathQuizzes: PathQuiz[]
  // Without their brief and task text (see projects.ts).
  pathProjects: PathProjectSummary[]
}

interface PathProblemData {
  // Without their text: a problem's page loads that with loadProblem() (problemText.ts).
  pathProblems: PathProblemSummary[]
}

type ChapterIndex = Record<string, { exerciseIds: string[]; quizSize: number }>
const INDEX = pathIndex as Record<string, { chapters: ChapterIndex; problemIds: string[] }>
const LOADERS: Record<PathPart, Record<string, () => Promise<unknown>>> = {
  content: pathContentLoaders as Record<string, () => Promise<unknown>>,
  problems: pathProblemLoaders as Record<string, () => Promise<unknown>>,
}
const loaded = { content: new Map<string, PathContentData>(), problems: new Map<string, PathProblemData>() }
const loading = new Map<string, Promise<void>>()
const NO_CONTENT: PathContentData = { pathModules: [], pathExercises: [], pathQuizzes: [], pathProjects: [] }
const NO_PROBLEMS: PathProblemData = { pathProblems: [] }

/** True when that part of the path is loaded (or the path has none to load). */
export function isPathPartLoaded(part: PathPart, pathId: string): boolean {
  return loaded[part].has(pathId) || !LOADERS[part][pathId]
}

/** Loads a part of a path once. A failed download (for example a lost connection) can be tried again. */
export function loadPathPart(part: PathPart, pathId: string): Promise<void> {
  if (isPathPartLoaded(part, pathId)) return Promise.resolve()
  const key = `${part}/${pathId}`
  let promise = loading.get(key)
  if (!promise) {
    promise = LOADERS[part][pathId]().then((module) => {
      if (part === 'content') loaded.content.set(pathId, module as PathContentData)
      else loaded.problems.set(pathId, module as PathProblemData)
    })
    promise.catch(() => loading.delete(key))
    loading.set(key, promise)
  }
  return promise
}

function content(pathId: string): PathContentData {
  return loaded.content.get(pathId) ?? NO_CONTENT
}

/** Written projects of a path, without their brief and task text (see projects.ts). Empty until the path's content is loaded. */
export function pathProjectSummaries(pathId: string): readonly PathProjectSummary[] {
  return content(pathId).pathProjects
}

/** A path's daily-problem ids, Day 1 first, from the index (no need to load the problem list). */
export function pathProblemIds(pathId: string): readonly string[] {
  return INDEX[pathId]?.problemIds ?? []
}

export function findChapterContent(pathId: string, chapterId: string): ContentLesson | undefined {
  return content(pathId).pathModules.find((module) => module.id === pathId)?.lessons.find((lesson) => lesson.id === chapterId)
}

export function chapterExercises(pathId: string, chapterId: string): readonly PathExercise[] {
  return content(pathId).pathExercises.filter((exercise) => exercise.chapterId === chapterId)
}

export function chapterQuiz(pathId: string, chapterId: string): PathQuiz | undefined {
  return content(pathId).pathQuizzes.find((quiz) => quiz.id === chapterId)
}

/** Whether a chapter is written, from the index (no need to load the path). */
export function isChapterWritten(pathId: string, chapterId: string): boolean {
  return Boolean(INDEX[pathId]?.chapters[chapterId])
}

/** The number of exercises in a written chapter, from the index. */
export function chapterExerciseCount(pathId: string, chapterId: string): number {
  return INDEX[pathId]?.chapters[chapterId]?.exerciseIds.length ?? 0
}

export function chapterUrl(pathId: string, chapterId: string): string {
  return `${pathUrl(pathId)}/${chapterId}`
}

/** Everything the progress calculations need to know about a path's written chapters (from the index, so the path list stays light). */
export function pathContext(pathId: string, record: PathRecord | undefined): PathContext {
  const chapters = INDEX[pathId]?.chapters ?? {}
  return {
    record,
    isWritten: (chapterId) => Boolean(chapters[chapterId]),
    exerciseIds: (chapterId) => chapters[chapterId]?.exerciseIds ?? [],
    quizSize: (chapterId) => chapters[chapterId]?.quizSize ?? 0,
  }
}

/** Where a chapter is read: its own page if written, otherwise its first Learn SQL lesson. Undefined for a planned chapter. */
export function chapterLink(path: CareerPath, chapter: PathChapter): string | undefined {
  if (isChapterWritten(path.id, chapter.id)) return chapterUrl(path.id, chapter.id)
  const first = chapter.lessons[0]
  return first ? lessonPath(first.moduleId, first.lessonId) : undefined
}

// --- Daily problems ----------------------------------------------------------------------

/** A path's written daily problems, Day 1 first. Days run without gaps, so the list's length is the last written day. */
export function pathProblemList(pathId: string): readonly PathProblemSummary[] {
  return (loaded.problems.get(pathId) ?? NO_PROBLEMS).pathProblems
}

export function findProblem(pathId: string, day: number): PathProblemSummary | undefined {
  return pathProblemList(pathId).find((problem) => problem.day === day)
}

export function problemsUrl(pathId: string): string {
  return `${pathUrl(pathId)}/problems`
}

export function problemUrl(pathId: string, day: number): string {
  return `${problemsUrl(pathId)}/${day}`
}
