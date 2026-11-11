/**
 * Progress through a career path, measured against its catalogue.
 *
 * A chapter is one of three kinds:
 *   - linked: it lists Learn SQL lessons; its progress comes from those lessons,
 *     so finishing a lesson counts in every path that uses it;
 *   - written: it has its own chapter page (explanations, exercises, quiz); its
 *     progress lives in the path's own record, so it never affects another path;
 *   - planned: neither yet. It is never part of a total or a percentage.
 *
 * Nothing here touches the browser or the bundled content, so it runs in Node
 * for npm run test:paths. The pages pass in what they know as a PathContext.
 */

import { isChapterAvailable, type CareerPath, type LessonRef, type PathChapter, type PathStage } from '../../content/paths/catalog.ts'
import type { ProgressData } from '../progress/progressModel.ts'
import { isLessonComplete, type Count } from '../progress/progressSummary.ts'
import type { PathRecord } from './pathModel.ts'

export type ChapterState = 'planned' | 'not-started' | 'in-progress' | 'complete'

/** What the pages know about a path beyond its catalogue entry. */
export interface PathContext {
  /** The path's saved record, if the learner has one. */
  record?: PathRecord
  /** True when the chapter has its own written chapter page. */
  isWritten: (chapterId: string) => boolean
  /** The ids of a written chapter's exercises. */
  exerciseIds: (chapterId: string) => readonly string[]
  /** The number of questions in a written chapter's quiz (0 if none). */
  quizSize: (chapterId: string) => number
}

/** No written chapters and no record: progress comes from Learn SQL lessons only. */
export const LESSONS_ONLY: PathContext = { isWritten: () => false, exerciseIds: () => [], quizSize: () => 0 }

/** A chapter quiz counts as passed from this share of correct answers. */
export const QUIZ_PASS_RATIO = 0.7

export function quizPassMark(total: number): number {
  return Math.ceil(total * QUIZ_PASS_RATIO)
}

export interface ChapterRequirements {
  exercises: Count
  quiz: { best: number | null; total: number; passMark: number; passed: boolean }
  /** True when every exercise is solved and the quiz is passed: the chapter can be completed. */
  met: boolean
}

/** What a written chapter asks for before it can be marked complete. */
export function chapterRequirements(chapterId: string, context: PathContext): ChapterRequirements {
  const ids = context.exerciseIds(chapterId)
  const solved = ids.filter((id) => context.record?.exercises[id]?.solvedAt).length
  const total = context.quizSize(chapterId)
  const saved = context.record?.quizzes[chapterId]
  const passMark = quizPassMark(total)
  const best = saved ? saved.bestScore : null
  const passed = best !== null && total > 0 && best >= passMark
  return { exercises: { done: solved, total: ids.length }, quiz: { best, total, passMark, passed }, met: solved === ids.length && ids.length > 0 && passed }
}

export interface ChapterStatus {
  state: ChapterState
  /** Steps done out of the chapter's steps: lessons for a linked chapter, exercises plus the quiz for a written one. */
  steps: Count
  /** "project" is a SQL Path project, whose steps are its tasks. */
  kind: 'linked' | 'written' | 'planned' | 'project'
}

export function chapterStatus(chapter: PathChapter, progress: ProgressData, context: PathContext = LESSONS_ONLY): ChapterStatus {
  if (context.isWritten(chapter.id)) {
    const requirements = chapterRequirements(chapter.id, context)
    const steps = { done: requirements.exercises.done + (requirements.quiz.passed ? 1 : 0), total: requirements.exercises.total + 1 }
    const record = context.record
    const started =
      context.exerciseIds(chapter.id).some((id) => (record?.exercises[id]?.attempts ?? 0) > 0) || Boolean(record?.quizzes[chapter.id])
    const state: ChapterState = record?.chapters[chapter.id] ? 'complete' : started ? 'in-progress' : 'not-started'
    return { state, steps, kind: 'written' }
  }
  if (!isChapterAvailable(chapter)) return { state: 'planned', steps: { done: 0, total: 0 }, kind: 'planned' }
  const total = chapter.lessons.length
  const done = chapter.lessons.filter((ref) => isLessonComplete(progress, ref.moduleId, ref.lessonId)).length
  const state: ChapterState = done === 0 ? 'not-started' : done === total ? 'complete' : 'in-progress'
  return { state, steps: { done, total }, kind: 'linked' }
}

export interface ChapterCount extends Count {
  /** Chapters shown on the roadmap but not written yet. Not part of `total`. */
  planned: number
}

function countChapters(chapters: readonly PathChapter[], progress: ProgressData, context: PathContext): ChapterCount {
  let done = 0
  let total = 0
  let planned = 0
  for (const chapter of chapters) {
    const { state } = chapterStatus(chapter, progress, context)
    if (state === 'planned') planned++
    else {
      total++
      if (state === 'complete') done++
    }
  }
  return { done, total, planned }
}

export function stageChapterCount(stage: PathStage, progress: ProgressData, context: PathContext = LESSONS_ONLY): ChapterCount {
  return countChapters(stage.chapters, progress, context)
}

export function pathChapterCount(path: CareerPath, progress: ProgressData, context: PathContext = LESSONS_ONLY): ChapterCount {
  return countChapters(
    path.stages.flatMap((stage) => stage.chapters),
    progress,
    context,
  )
}

export interface NextStep {
  stage: PathStage
  chapter: PathChapter
  /** For a linked chapter, the first lesson not yet complete. Absent for a written chapter: open its chapter page. */
  lesson?: LessonRef
}

/** The first ready chapter that is not complete. Null when there is none. Planned chapters are never offered. */
export function nextStep(path: CareerPath, progress: ProgressData, context: PathContext = LESSONS_ONLY): NextStep | null {
  for (const stage of path.stages) {
    for (const chapter of stage.chapters) {
      const status = chapterStatus(chapter, progress, context)
      if (status.state === 'planned' || status.state === 'complete') continue
      if (status.kind === 'written') return { stage, chapter }
      const lesson = chapter.lessons.find((ref) => !isLessonComplete(progress, ref.moduleId, ref.lessonId))
      if (lesson) return { stage, chapter, lesson }
    }
  }
  return null
}

export interface ChapterPosition {
  stage: PathStage
  stageIndex: number
  /** Position among all the path's chapters, from 0. */
  index: number
  total: number
  previous?: PathChapter
  next?: PathChapter
}

/** Where a chapter sits in its path, with the chapters before and after it. */
export function chapterPosition(path: CareerPath, chapterId: string): ChapterPosition | null {
  const all = path.stages.flatMap((stage, stageIndex) => stage.chapters.map((chapter) => ({ chapter, stage, stageIndex })))
  const index = all.findIndex((entry) => entry.chapter.id === chapterId)
  if (index === -1) return null
  return {
    stage: all[index].stage,
    stageIndex: all[index].stageIndex,
    index,
    total: all.length,
    previous: all[index - 1]?.chapter,
    next: all[index + 1]?.chapter,
  }
}
