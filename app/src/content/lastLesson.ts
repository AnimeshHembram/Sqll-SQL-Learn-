import type { ProgressData } from '../features/progress/progressModel.ts'
import { isLessonComplete, nextIncompleteLesson } from '../features/progress/progressSummary.ts'
import { readStored, writeStored } from '../lib/storage.ts'
import { MODULES, findLesson, type LessonLocation } from './index.ts'

/** Versioned so the saved shape can change later without misreading old data. */
const KEY = 'last-lesson:v1'

interface StoredLesson {
  moduleId: string
  lessonId: string
}

function isStoredLesson(value: unknown): value is StoredLesson {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.moduleId === 'string' && typeof candidate.lessonId === 'string'
}

/** Remembers the lesson the learner last opened, in this browser only. */
export function rememberLastLesson(moduleId: string, lessonId: string): void {
  writeStored(KEY, { moduleId, lessonId } satisfies StoredLesson)
}

/** The last lesson opened, if it still exists in the course. */
export function recallLastLesson(): LessonLocation | undefined {
  const stored = readStored(KEY)
  return isStoredLesson(stored) ? findLesson(stored.moduleId, stored.lessonId) : undefined
}

/** True for a learner who has not opened or completed any lesson yet. */
export function isNewLearner(progress: ProgressData): boolean {
  return !recallLastLesson() && Object.keys(progress.lessons).length === 0
}

/**
 * The lesson to open next: the last lesson opened if it is not complete yet,
 * otherwise the first incomplete lesson in the course. Undefined when every
 * lesson is complete. Matches the dashboard's "Continue learning" card.
 */
export function lessonToContinue(progress: ProgressData): LessonLocation | undefined {
  const last = recallLastLesson()
  if (last && !isLessonComplete(progress, last.module.id, last.lesson.id)) return last
  const upcoming = nextIncompleteLesson(MODULES, progress)
  return upcoming && findLesson(upcoming.module.id, upcoming.lessonId)
}
