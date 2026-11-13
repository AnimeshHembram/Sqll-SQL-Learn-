import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { ExerciseCard } from '../components/paths/ExerciseCard.tsx'
import { useProject } from '../components/paths/useProject.ts'
import { formatDate } from '../components/progress/format.ts'
import { SchemaExplorer } from '../components/sql/SchemaExplorer.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { findPath, pathUrl, type CareerPath } from '../content/paths/catalog.ts'
import { findProject, fullTask, projectTaskUrl, projectUrl } from '../content/paths/projects.ts'
import type { PathProjectSummary, ProjectTaskSummary } from '../content/types.ts'
import {
  recordPathProjectTaskHints,
  recordPathProjectTaskSolutionRevealed,
  recordPathProjectTaskSubmission,
  usePathProgress,
} from '../features/paths/pathStore.ts'
import { projectProgress } from '../features/paths/projectSummary.ts'
import { challengeEngine } from '../features/sql/sqlEngine.ts'
import { useSqlEngine } from '../features/sql/useSqlEngine.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ProjectPage.module.css'
import { PathContentGate } from '../components/paths/PathContentGate.tsx'

const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' } as const

/** The page, once the path's content is loaded (PathContentGate). */
export function ProjectTaskPage() {
  return (
    <PathContentGate>
      <ProjectTaskPageContent />
    </PathContentGate>
  )
}

function ProjectTaskPageContent() {
  const { pathId = '', projectId = '', step = '' } = useParams()
  const path = findPath(pathId)
  const project = path ? findProject(path.id, projectId) : undefined
  const number = /^\d{1,2}$/.test(step) ? Number(step) : NaN
  const task = project?.tasks.find((candidate) => candidate.step === number)
  if (!path || !project || !task) return <NotFoundPage />
  // A new key per task, so moving to the next task starts with fresh page state.
  return <TaskView key={task.id} path={path} project={project} task={task} />
}

function TaskView({ path, project, task }: { path: CareerPath; project: PathProjectSummary; task: ProjectTaskSummary }) {
  const record = usePathProgress().paths[path.id]
  const saved = record?.exercises[task.id]
  const progress = projectProgress(project, record)
  const engine = useSqlEngine(challengeEngine)
  const { engineUsable, text, retryText, tables, schema } = useProject(project, engine)
  const full = text && 'text' in text ? fullTask(task, text.text) : undefined
  const taskIds = useMemo(() => project.tasks.map((item) => item.id), [project])
  const milestoneIndex = project.milestones.findIndex((milestone) => milestone.id === task.milestoneId)
  const milestone = project.milestones[milestoneIndex]
  const isFinal = task.id === project.finalTaskId
  const previous = project.tasks[task.step - 2]
  const next = project.tasks[task.step]
  const taskTables = useMemo(() => (tables ? tables.filter((table) => task.tables.includes(table.name)) : null), [tables, task.tables])
  const heading = isFinal ? `Final challenge: ${task.title}` : `Task ${task.step}: ${task.title}`

  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.paths.label, to: NAV.paths.path },
          { label: path.title, to: pathUrl(path.id) },
          { label: project.title, to: projectUrl(path.id, project.id) },
        ]}
      />
      <PageHeader
        title={heading}
        documentTitle={`${heading} · ${project.title}`}
        description={task.summary}
        meta={`Milestone ${milestoneIndex + 1} of ${project.milestones.length}: ${milestone?.title ?? ''} · ${task.topic} · ${LEVEL_LABELS[task.difficulty]} · About ${task.durationMinutes} minutes · Task ${task.step} of ${project.tasks.length}`}
      />

      <p className={styles.status} role="status">
        {saved?.solvedAt
          ? `Solved on ${formatDate(saved.solvedAt)}${saved.attempts > 1 ? ` after ${saved.attempts} attempts` : ''}. ${progress.solved} of ${progress.total} project tasks solved.`
          : saved && saved.attempts > 0
            ? `${saved.attempts} ${saved.attempts === 1 ? 'attempt' : 'attempts'} so far. Your attempts are saved; come back any time.`
            : `Not tried yet. ${progress.solved} of ${progress.total} project tasks solved.`}
        {progress.completedAt && (
          <>
            {' '}
            <Link to={projectUrl(path.id, project.id)} className={styles.continue}>
              Project complete: see the model findings and your summary
            </Link>
          </>
        )}
      </p>

      <div className={styles.about}>
        {milestone && (
          <Card title="Where this fits">
            <p>
              <strong>Milestone {milestoneIndex + 1}: {milestone.title}.</strong> {milestone.goal}
            </p>
          </Card>
        )}
        {full && (
          <Card title="This task practises">
            <ul className={styles.bullets}>
              {full.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card
        title={task.tables.length === 1 ? 'The table for this task' : 'Tables for this task'}
        description={`Columns and types in the ${project.company} database. Your query runs on a fresh copy, so nothing you try can change it.`}
        className={styles.block}
      >
        <SchemaExplorer tables={engineUsable ? taskTables : null} />
      </Card>

      {text && 'failed' in text && (
        <div className={styles.failure} role="alert">
          <p>Task {task.step} could not be loaded. Check your connection and try again.</p>
          <Button variant="secondary" onClick={retryText}>
            Try again
          </Button>
        </div>
      )}
      {!text && (
        <p className={styles.loading} role="status">
          Loading Task {task.step}…
        </p>
      )}
      {full && (
        <ExerciseCard
          exercise={full}
          label={isFinal ? 'Final challenge' : `Task ${task.step}`}
          headingLevel={2}
          expected={task.expected}
          dataset={project.dataset}
          saved={saved}
          schema={schema}
          engineFailed={engine.status === 'failed'}
          recorder={{
            submitted: (correct) => recordPathProjectTaskSubmission(path.id, project.id, task.id, correct, taskIds),
            hintsShown: (count) => recordPathProjectTaskHints(path.id, project.id, task.id, count),
            solutionRevealed: () => recordPathProjectTaskSolutionRevealed(path.id, project.id, task.id),
          }}
        />
      )}
      {engine.status === 'failed' && (
        <div className={styles.failure} role="alert">
          <p>{engine.failure}</p>
          <Button variant="secondary" onClick={() => void challengeEngine.retry().catch(() => undefined)}>
            Try again
          </Button>
        </div>
      )}

      <nav className={styles.pager} aria-label="Task navigation">
        {previous ? (
          <Link to={projectTaskUrl(path.id, project.id, previous.step)} className={styles.pagerLink}>
            <span className={styles.pagerLabel}>Previous task</span>
            Task {previous.step}: {previous.title}
          </Link>
        ) : (
          <span />
        )}
        <Link to={projectUrl(path.id, project.id)} className={styles.allLink}>
          Project overview
        </Link>
        {next ? (
          <Link to={projectTaskUrl(path.id, project.id, next.step)} className={styles.pagerLink} data-direction="next">
            <span className={styles.pagerLabel}>Next task</span>
            {next.id === project.finalTaskId ? 'Final challenge' : `Task ${next.step}`}: {next.title}
          </Link>
        ) : (
          <span className={styles.pagerNote}>This is the final challenge.</span>
        )}
      </nav>
    </>
  )
}
