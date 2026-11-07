/**
 * Progress through a career path, measured against its catalogue.
 *
 * Only available chapters count. A planned chapter (no lessons yet) is never
 * part of a total or a percentage, so a learner cannot appear to be further
 * along, or less far along, than the content that actually exists.
 *
 * An available chapter's progress comes from the Learn SQL lessons it lists,
 * so finishing a lesson counts in every path that uses it.
 */

import { isChapterAvailable, type CareerPath, type LessonRef, type PathChapter, type PathStage } from '../../content/paths/catalog.ts'
import type { ProgressData } from '../progress/progressModel.ts'
import { isLessonComplete, type Count } from '../progress/progressSummary.ts'

export type ChapterState = 'planned' | 'not-started' | 'in-progress' | 'complete'

export interface ChapterStatus {
  state: ChapterState
  /** Lessons complete, out of the chapter's lessons. Both 0 for a planned chapter. */
  lessons: Count
}

export function chapterStatus(chapter: PathChapter, progress: ProgressData): ChapterStatus {
  if (!isChapterAvailable(chapter)) return { state: 'planned', lessons: { done: 0, total: 0 } }
  const total = chapter.lessons.length
  const done = chapter.lessons.filter((ref) => isLessonComplete(progress, ref.moduleId, ref.lessonId)).length
  const state: ChapterState = done === 0 ? 'not-started' : done === total ? 'complete' : 'in-progress'
  return { state, lessons: { done, total } }
}

export interface ChapterCount extends Count {
  /** Chapters shown on the roadmap but not written yet. Not part of `total`. */
  planned: number
}

function countChapters(chapters: readonly PathChapter[], progress: ProgressData): ChapterCount {
  let done = 0
  let total = 0
  let planned = 0
  for (const chapter of chapters) {
    const { state } = chapterStatus(chapter, progress)
    if (state === 'planned') planned++
    else {
      total++
      if (state === 'complete') done++
    }
  }
  return { done, total, planned }
}

export function stageChapterCount(stage: PathStage, progress: ProgressData): ChapterCount {
  return countChapters(stage.chapters, progress)
}

export function pathChapterCount(path: CareerPath, progress: ProgressData): ChapterCount {
  return countChapters(
    path.stages.flatMap((stage) => stage.chapters),
    progress,
  )
}

export interface NextStep {
  stage: PathStage
  chapter: PathChapter
  /** The first lesson of the chapter not yet complete. */
  lesson: LessonRef
}

/** The first available chapter that is not complete, with the lesson to open. Null when there is none. */
export function nextStep(path: CareerPath, progress: ProgressData): NextStep | null {
  for (const stage of path.stages) {
    for (const chapter of stage.chapters) {
      const lesson = chapter.lessons.find((ref) => !isLessonComplete(progress, ref.moduleId, ref.lessonId))
      if (lesson) return { stage, chapter, lesson }
    }
  }
  return null
}
