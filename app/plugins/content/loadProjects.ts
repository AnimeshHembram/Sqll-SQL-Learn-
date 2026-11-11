import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { ChallengeSolution, PathProjectSummary, ProjectMilestone, ProjectTask, ProjectText } from '../../src/content/types.ts'
import { checkMarkdown, readFields, splitSections, toHtml, type FieldSpec, ID_PATTERN } from './fields.ts'
import { parseFrontMatter } from './frontMatter.ts'
import { loadChallenges, type WrongAnswer } from './loadChallenges.ts'
import { displayPath } from './loadContent.ts'
import { markdown, type Token } from './markdown.ts'
import { splitTask } from './projectText.ts'

/**
 * SQL Path projects: a realistic analysis worked through in milestones, on the project's own dataset.
 *
 *   <root>/<path-id>/<project-id>/project.md              the brief (front matter + "##" sections)
 *   <root>/<path-id>/<project-id>/tasks/<nn>-<name>.md    one task per file, in challenge format
 *
 * A task's "module" field names its milestone, its "order" is its step (the <nn> in the file name),
 * and its "dataset" must be the project's dataset. Steps run from 1 without gaps; the final task
 * (front matter "finalTask") is the last step and belongs to the last milestone. Every task is
 * checked against real SQLite by npm run check:challenges, like challenges and daily problems.
 */

export interface ProjectLoadResult {
  projects: { summary: PathProjectSummary; text: ProjectText }[]
  /** Every task with its full text, for scripts/check-challenges.ts and the tests. */
  tasks: ProjectTask[]
  solutions: Record<string, ChallengeSolution>
  wrongAnswers: Record<string, WrongAnswer[]>
  sourceFiles: Record<string, string>
  errors: string[]
  files: string[]
}

export const PROJECT_FILE = 'project.md'

/** The brief's sections, in this order. "Model findings" is shown once the project is complete. */
export const PROJECT_SECTIONS = [
  'Scenario',
  'The company',
  'The problem',
  'Objectives',
  'The data',
  'Business questions',
  'Present your findings',
  'Model findings',
  'What you accomplished',
] as const

const FIELDS: Record<string, FieldSpec> = {
  id: { kind: 'id' },
  title: { kind: 'text' },
  order: { kind: 'positiveInteger' },
  summary: { kind: 'text' },
  company: { kind: 'text' },
  industry: { kind: 'text' },
  dataset: { kind: 'id' },
  duration: { kind: 'positiveInteger' },
  /** "<id> | <title> | <goal>" per milestone, in order. */
  milestones: { kind: 'list' },
  finalTask: { kind: 'id' },
}

const TASK_FILE = /^(\d{2})-[a-z0-9-]+\.md$/

function folders(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : []
}

function readMilestones(items: string[], report: (message: string) => void): ProjectMilestone[] {
  const milestones: ProjectMilestone[] = []
  for (const item of items) {
    const parts = item.split(' | ').map((part) => part.trim())
    if (parts.length !== 3 || !ID_PATTERN.test(parts[0]) || !parts[1] || !parts[2]) {
      report(`milestone "${item}" must be written "<id> | <title> | <goal>"`)
      continue
    }
    milestones.push({ id: parts[0], title: parts[1], goal: parts[2] })
  }
  if (new Set(milestones.map((milestone) => milestone.id)).size !== milestones.length) report('milestone ids must be different')
  return milestones
}

/**
 * @param root the projects folder (<paths-content>/projects)
 * @param knownPaths path ids that have chapters
 * @param takenIds ids already used by challenges, exercises and daily problems
 */
export function loadProjects(root: string, datasetsDir: string, knownPaths: ReadonlySet<string>, takenIds: ReadonlySet<string>): ProjectLoadResult {
  const result: ProjectLoadResult = { projects: [], tasks: [], solutions: {}, wrongAnswers: {}, sourceFiles: {}, errors: [], files: [] }
  if (!existsSync(root)) return result

  for (const pathId of folders(root)) {
    if (!knownPaths.has(pathId)) {
      result.errors.push(`${displayPath(path.join(root, pathId))}: there is no chapter folder for path "${pathId}"`)
      continue
    }
    for (const folder of folders(path.join(root, pathId))) {
      const dir = path.join(root, pathId, folder)
      const file = path.join(dir, PROJECT_FILE)
      const report = (message: string) => result.errors.push(`${displayPath(file)}: ${message}`)
      if (!existsSync(file)) {
        result.errors.push(`${displayPath(dir)}: a project folder needs a ${PROJECT_FILE}`)
        continue
      }
      result.files.push(file)
      const errorsBefore = result.errors.length

      const { data, body, errors: syntaxErrors } = parseFrontMatter(readFileSync(file, 'utf8'))
      syntaxErrors.forEach(report)
      const fields = readFields(data, FIELDS, report)
      const tokens = markdown.lexer(body)
      const { intro, sections } = splitSections(tokens)
      if (intro.length > 0) report('put all content under "##" sections (the first section is "## Scenario")')
      const titles = sections.map((section) => section.title)
      if (titles.join('\n') !== PROJECT_SECTIONS.join('\n')) {
        report(`the brief needs exactly these "##" sections, in this order: ${PROJECT_SECTIONS.join(', ')} (found: ${titles.join(', ') || 'none'})`)
      }
      for (const section of sections) {
        if (section.tokens.length === 0) report(`"## ${section.title}" is empty`)
        checkMarkdown(section.tokens, report, ['sql', 'sql syntax'])
      }
      if (!fields) continue
      if (fields.id !== folder) report(`"id" is "${fields.id as string}", but the folder is "${folder}"`)
      const dataset = fields.dataset as string
      const datasetFile = path.join(datasetsDir, `${dataset}.sql`)
      if (existsSync(datasetFile)) result.files.push(datasetFile)
      else report(`dataset "${dataset}" not found; expected ${displayPath(datasetFile)}`)
      const milestones = readMilestones(fields.milestones as string[], report)

      // --- Tasks -------------------------------------------------------------------------------
      const tasksDir = path.join(dir, 'tasks')
      if (!existsSync(tasksDir)) {
        report('the project has no tasks folder')
        continue
      }
      const loaded = loadChallenges(tasksDir, datasetsDir, new Set(milestones.map((milestone) => milestone.id)))
      result.errors.push(...loaded.errors)
      result.files.push(...loaded.files)
      const tasks: ProjectTask[] = []
      for (const challenge of loaded.challenges) {
        const taskFile = loaded.sourceFiles[challenge.id]
        const taskReport = (message: string) => result.errors.push(`${displayPath(taskFile)}: ${message}`)
        const match = TASK_FILE.exec(path.basename(taskFile))
        if (!match) {
          taskReport('name project tasks "<nn>-<name>.md", for example "01-order-profile.md"')
          continue
        }
        const step = Number(match[1])
        if (challenge.order !== step) taskReport(`"order" is ${challenge.order}, but the file is step ${step}`)
        if (!challenge.moduleId) taskReport('"module" must name the task\'s milestone')
        if (challenge.dataset !== dataset) taskReport(`"dataset" must be the project's dataset, "${dataset}"`)
        if (takenIds.has(challenge.id) || result.solutions[challenge.id]) {
          taskReport(`id "${challenge.id}" is already used by another challenge, exercise, problem or task`)
          continue
        }
        const solution = loaded.solutions[challenge.id]
        const expected = { columns: solution.expected.columns, rowCount: solution.expected.rows.length }
        tasks.push({ ...challenge, pathId, projectId: folder, milestoneId: challenge.moduleId ?? '', step, expected })
        // The worker runs these on the project's dataset (only set when it is not the bookstore).
        result.solutions[challenge.id] = dataset === 'bookstore' ? solution : { ...solution, dataset }
        result.wrongAnswers[challenge.id] = loaded.wrongAnswers[challenge.id] ?? []
        result.sourceFiles[challenge.id] = taskFile
      }
      tasks.sort((a, b) => a.step - b.step)
      tasks.forEach((task, index) => {
        if (task.step !== index + 1) report(`tasks must run from step 1 without gaps; step ${index + 1} is missing or repeated`)
      })
      for (const milestone of milestones) {
        if (!tasks.some((task) => task.milestoneId === milestone.id)) report(`milestone "${milestone.id}" has no tasks`)
      }
      // Milestones are worked through in order, so their tasks must be in milestone order too.
      const milestoneIndex = (task: ProjectTask) => milestones.findIndex((milestone) => milestone.id === task.milestoneId)
      if (tasks.some((task, index) => index > 0 && milestoneIndex(task) < milestoneIndex(tasks[index - 1]))) {
        report('tasks must be numbered in milestone order')
      }
      const finalTask = fields.finalTask as string
      const last = tasks[tasks.length - 1]
      if (!last || last.id !== finalTask) report(`"finalTask" must be the id of the last task (${last?.id ?? 'none'})`)
      else if (last.milestoneId !== milestones[milestones.length - 1]?.id) report('the final task must belong to the last milestone')

      if (result.errors.length > errorsBefore) continue
      result.tasks.push(...tasks)
      const summary: PathProjectSummary = {
        id: folder,
        pathId,
        title: fields.title as string,
        order: fields.order as number,
        summary: fields.summary as string,
        company: fields.company as string,
        industry: fields.industry as string,
        dataset,
        durationMinutes: fields.duration as number,
        milestones,
        finalTaskId: finalTask,
        tasks: tasks.map((task) => splitTask(task).summary),
      }
      const text: ProjectText = {
        sections: sections.map((section) => ({ title: section.title, html: toHtml(section.tokens as Token[], section.title) })),
        tasks: Object.fromEntries(tasks.map((task) => [task.id, splitTask(task).text])),
      }
      result.projects.push({ summary, text })
    }
  }
  result.projects.sort((a, b) => a.summary.pathId.localeCompare(b.summary.pathId) || a.summary.order - b.summary.order)
  return result
}
