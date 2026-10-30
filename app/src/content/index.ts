import { modules } from 'virtual:sql-learner-content'
import { NAV } from '../app/navigation.ts'
import type { ContentLesson, ContentModule, Level } from './types.ts'

export type { ContentLesson, ContentModule, Level } from './types.ts'

/** Every module, in curriculum order. Validated at build time by plugins/content. */
export const MODULES = modules as readonly ContentModule[]

export interface LessonLocation {
  module: ContentModule
  lesson: ContentLesson
  /** Zero-based position in the module. */
  index: number
  previous?: ContentLesson
  next?: ContentLesson
}

export function findModule(moduleId: string): ContentModule | undefined {
  return MODULES.find((module) => module.id === moduleId)
}

export function findLesson(moduleId: string, lessonId: string): LessonLocation | undefined {
  const module = findModule(moduleId)
  if (!module) return undefined
  const index = module.lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return undefined
  return {
    module,
    lesson: module.lessons[index],
    index,
    previous: module.lessons[index - 1],
    next: module.lessons[index + 1],
  }
}

/** The first lesson of the course, or undefined if there is no content. */
export function findFirstLesson(): LessonLocation | undefined {
  const module = MODULES[0]
  const lesson = module?.lessons[0]
  return module && lesson ? findLesson(module.id, lesson.id) : undefined
}

export function modulePath(moduleId: string): string {
  return `${NAV.learn.path}/${moduleId}`
}

export function lessonPath(moduleId: string, lessonId: string): string {
  return `${modulePath(moduleId)}/${lessonId}`
}

/** For example "Beginner". */
export function formatLevel(level: Level): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

/** For example "5 lessons". */
export function formatLessonCount(module: ContentModule): string {
  const count = module.lessons.length
  return `${count} ${count === 1 ? 'lesson' : 'lessons'}`
}

/** For example "about 48 minutes". */
export function formatModuleDuration(module: ContentModule): string {
  const minutes = module.lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0)
  return `about ${minutes} minutes`
}

/** For example "Beginner, 5 lessons, about 48 minutes". */
export function describeModule(module: ContentModule): string {
  return `${formatLevel(module.level)}, ${formatLessonCount(module)}, ${formatModuleDuration(module)}`
}
