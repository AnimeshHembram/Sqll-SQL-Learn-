/**
 * SQL Path projects: progress through a project's tasks and milestones, calculated from a path's
 * record. Task progress is saved in `exercises` (keyed by task id); the project's own entry holds
 * when it was started and completed. Pure functions, so they run in Node for npm run test:paths.
 */

import type { PathProjectSummary, ProjectMilestone, ProjectTaskSummary } from '../../content/types.ts'
import type { PathRecord } from './pathModel.ts'
import type { ChapterStatus } from './pathSummary.ts'

export interface MilestoneProgress {
  milestone: ProjectMilestone
  tasks: ProjectTaskSummary[]
  solved: number
  complete: boolean
}

export interface ProjectProgress {
  solved: number
  total: number
  /** Any task attempted, hinted or revealed. */
  started: boolean
  /** When every task was first solved, or null. */
  completedAt: string | null
  milestones: MilestoneProgress[]
  /** The first unsolved task in step order, or undefined when all are solved. */
  nextTask: ProjectTaskSummary | undefined
}

export function isTaskSolved(taskId: string, record: PathRecord | undefined): boolean {
  return Boolean(record?.exercises[taskId]?.solvedAt)
}

export function projectProgress(project: PathProjectSummary, record: PathRecord | undefined): ProjectProgress {
  const solvedTask = (task: ProjectTaskSummary) => isTaskSolved(task.id, record)
  const milestones = project.milestones.map((milestone) => {
    const tasks = project.tasks.filter((task) => task.milestoneId === milestone.id)
    const solved = tasks.filter(solvedTask).length
    return { milestone, tasks, solved, complete: tasks.length > 0 && solved === tasks.length }
  })
  const solved = project.tasks.filter(solvedTask).length
  const entry = record?.projects[project.id]
  const touched = project.tasks.some((task) => {
    const saved = record?.exercises[task.id]
    return Boolean(saved && (saved.attempts > 0 || saved.hintsUsed > 0 || saved.revealedSolution))
  })
  return {
    solved,
    total: project.tasks.length,
    started: Boolean(entry) || touched,
    completedAt: entry?.completedAt ?? null,
    milestones,
    nextTask: project.tasks.find((task) => !solvedTask(task)),
  }
}

/** The project's state in the same form as a chapter's, for the path page's status label. */
export function projectStatus(progress: ProjectProgress): ChapterStatus {
  const steps = { done: progress.solved, total: progress.total }
  const state: ChapterStatus['state'] = progress.completedAt ? 'complete' : progress.started ? 'in-progress' : 'not-started'
  return { state, steps, kind: 'project' }
}

/** "About 4 hours", "About 45 minutes". */
export function projectDuration(minutes: number): string {
  return minutes >= 90 ? `About ${Math.round(minutes / 60)} hours` : `About ${minutes} minutes`
}
