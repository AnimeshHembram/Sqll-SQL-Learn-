import { readStored, writeStored } from '../lib/storage.ts'
import { findLesson, type LessonLocation } from './index.ts'

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
