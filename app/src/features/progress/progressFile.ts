import { parsePathProgress, type PathProgressData } from '../paths/pathModel.ts'
import { parseProgress, type ProgressData } from './progressModel.ts'

/**
 * The progress file made by Settings → "Export progress" and read by "Import
 * progress". Pure functions, so npm run test:paths runs them in Node.
 *
 * A file holds both kinds of saved progress:
 *   { app: 'sql-learner', exportedAt, progress: <Learn SQL progress:v1>, paths: <SQL Path paths:v1> }
 *
 * Files exported before SQL Path existed have no `paths`. They still import:
 * their Learn SQL progress replaces the current one and SQL Path progress is
 * kept, because the file says nothing about it. A file whose `paths` is present
 * but damaged is refused as a whole, so an import never half-applies.
 *
 * Saved drafts are not progress and are never exported.
 */

export interface ProgressFile {
  progress: ProgressData
  /** SQL Path progress, or null when the file predates SQL Path. */
  paths: PathProgressData | null
}

export function buildProgressFile(progress: ProgressData, paths: PathProgressData, now = new Date()): string {
  return JSON.stringify({ app: 'sql-learner', exportedAt: now.toISOString(), progress, paths }, null, 2)
}

/**
 * Reads a progress file. Also accepts the bare stored Learn SQL object, as
 * earlier versions did. Returns null if the text is not SQL Learner progress.
 */
export function parseProgressFileText(text: string): ProgressFile | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  if ('progress' in value) {
    const file = value as { progress: unknown; paths?: unknown }
    const progress = parseProgress(file.progress)
    if (!progress) return null
    if (file.paths === undefined) return { progress, paths: null }
    const paths = parsePathProgress(file.paths)
    return paths ? { progress, paths } : null
  }

  const progress = parseProgress(value)
  return progress ? { progress, paths: null } : null
}

/** True when there is no SQL Path progress at all (no path has ever been chosen). */
export function isPathProgressEmpty(paths: PathProgressData): boolean {
  return Object.keys(paths.paths).length === 0
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** For example "2 career paths: 3 chapters, 7 exercises and 5 daily problems". */
export function describePathProgress(paths: PathProgressData): string {
  const records = Object.values(paths.paths)
  if (records.length === 0) return 'no SQL Path progress'
  let chapters = 0
  let exercises = 0
  let problems = 0
  for (const record of records) {
    chapters += Object.keys(record.chapters).length
    exercises += Object.values(record.exercises).filter((item) => item.solvedAt).length
    problems += Object.values(record.problems).filter((item) => item.solvedAt).length
  }
  return (
    `${plural(records.length, 'career path')}: ${plural(chapters, 'completed chapter')}, ` +
    `${plural(exercises, 'solved exercise')} and ${plural(problems, 'solved daily problem')}`
  )
}
