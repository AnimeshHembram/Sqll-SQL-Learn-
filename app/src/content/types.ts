/**
 * Shape of the lesson content produced at build time by `plugins/content`.
 * Shared by the build plugin (which creates it) and the app (which reads it).
 */

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type Level = (typeof LEVELS)[number]

/** A runnable code block in a lesson. Its index matches the `data-example` attribute in the HTML. */
export interface LessonExample {
  /** `example` should run; `error` is a mistake that should fail. */
  kind: 'example' | 'error'
  sql: string
  /** The result table shown in the lesson, if any. */
  expected: { columns: string[]; rows: string[][] } | null
}

export interface ContentLesson {
  id: string
  title: string
  /** Position within its module, starting at 1. */
  order: number
  level: Level
  summary: string
  durationMinutes: number
  objectives: string[]
  /** Lesson body, converted from Markdown to HTML at build time. */
  html: string
  /** Runnable examples, in the order they appear. */
  examples: LessonExample[]
}

export interface ContentModule {
  id: string
  title: string
  /** Position in the curriculum, starting at 1. */
  order: number
  level: Level
  summary: string
  /** Module introduction, converted from Markdown to HTML at build time. */
  introHtml: string
  /** Sorted by `order`. */
  lessons: ContentLesson[]
}
