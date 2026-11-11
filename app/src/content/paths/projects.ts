import { projectLoaders } from 'virtual:sql-learner-project-index'
import type { PathProjectSummary, ProjectTask, ProjectTaskSummary, ProjectText } from '../types.ts'
import { pathUrl } from './catalog.ts'
// Read through chapters.ts, so the SQL Path content stays one module for the build.
import { PROJECTS } from './chapters.ts'

/**
 * Written SQL Path projects. Every SQL Path page knows each project's milestones and task list
 * (from virtual:sql-learner-path-content); the brief and the task text load with the project's
 * own pages, once per project (plugins/content/projectText.ts). Solutions stay in the worker.
 */

const loaders = projectLoaders as Record<string, () => Promise<{ projectText: unknown }>>
const cache = new Map<string, Promise<ProjectText>>()

export function pathProjectList(pathId: string): readonly PathProjectSummary[] {
  return PROJECTS.filter((project) => project.pathId === pathId)
}

export function findProject(pathId: string, projectId: string): PathProjectSummary | undefined {
  return PROJECTS.find((project) => project.pathId === pathId && project.id === projectId)
}

export function projectUrl(pathId: string, projectId: string): string {
  return `${pathUrl(pathId)}/projects/${projectId}`
}

export function projectTaskUrl(pathId: string, projectId: string, step: number): string {
  return `${projectUrl(pathId, projectId)}/${step}`
}

/** Loads a project's brief and task text (once; a failed download can be tried again). */
export function loadProjectText(project: PathProjectSummary): Promise<ProjectText> {
  const key = `${project.pathId}/${project.id}`
  const cached = cache.get(key)
  if (cached) return cached
  const loader = loaders[key]
  if (!loader) return Promise.reject(new Error(`No text is bundled for the project ${key}.`))
  const loading = loader().then(({ projectText }) => projectText as ProjectText)
  loading.catch(() => cache.delete(key))
  cache.set(key, loading)
  return loading
}

/** A complete task: its summary from the project list plus its text. */
export function fullTask(summary: ProjectTaskSummary, text: ProjectText): ProjectTask | undefined {
  const own = text.tasks[summary.id]
  return own ? { ...summary, ...own } : undefined
}
