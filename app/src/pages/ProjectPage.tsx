import { useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { ChapterState } from '../components/paths/ChapterState.tsx'
import { useProject } from '../components/paths/useProject.ts'
import { Prose } from '../components/content/Prose.tsx'
import { CompletionBadge } from '../components/progress/CompletionBadge.tsx'
import { formatDate } from '../components/progress/format.ts'
import { SchemaExplorer } from '../components/sql/SchemaExplorer.tsx'
import { Breadcrumbs } from '../components/ui/Breadcrumbs.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { findPath, pathUrl, type CareerPath } from '../content/paths/catalog.ts'
import { findProject, projectTaskUrl } from '../content/paths/projects.ts'
import type { PathProjectSummary, ProjectText } from '../content/types.ts'
import { usePathProgress } from '../features/paths/pathStore.ts'
import { isTaskSolved, projectDuration, projectProgress } from '../features/paths/projectSummary.ts'
import { challengeEngine } from '../features/sql/sqlEngine.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import styles from './ProjectPage.module.css'

export function ProjectPage() {
  const { pathId = '', projectId = '' } = useParams()
  const path = findPath(pathId)
  const project = path ? findProject(path.id, projectId) : undefined
  if (!path || !project) return <NotFoundPage />
  return <ProjectOverview key={project.id} path={path} project={project} />
}

function section(text: ProjectText, title: string): string | undefined {
  return text.sections.find((candidate) => candidate.title === title)?.html
}

function ProjectOverview({ path, project }: { path: CareerPath; project: PathProjectSummary }) {
  const record = usePathProgress().paths[path.id]
  const progress = projectProgress(project, record)
  // Read directly rather than through useSqlEngine, which shares a build chunk with the SQL editor this page does not need.
  const engine = useSyncExternalStore(challengeEngine.subscribe, challengeEngine.getState)
  const { engineUsable, text, retryText, tables } = useProject(project, engine)
  const brief = text && 'text' in text ? text.text : null
  const projectNumber = path.projects.findIndex((candidate) => candidate.id === project.id) + 1
  const next = progress.nextTask
  const remaining = progress.total - progress.solved

  return (
    <>
      <Breadcrumbs
        items={[
          { label: NAV.paths.label, to: NAV.paths.path },
          { label: path.title, to: pathUrl(path.id) },
        ]}
      />
      <PageHeader
        title={`Project ${projectNumber}: ${project.title}`}
        documentTitle={`${project.title} · ${path.title} project`}
        description={project.summary}
        meta={`${project.company} · ${project.industry} · ${projectDuration(project.durationMinutes)} · ${project.tasks.length} tasks in ${project.milestones.length} milestones`}
        actions={
          next ? (
            <Button to={projectTaskUrl(path.id, project.id, next.step)}>
              {progress.solved === 0 ? 'Start' : 'Continue'}: Task {next.step}, {next.title}
            </Button>
          ) : (
            <Button to={projectTaskUrl(path.id, project.id, 1)} variant="secondary">
              Review the tasks
            </Button>
          )
        }
      />

      <div className={styles.status} role="status">
        <p>
          {progress.completedAt
            ? `Project complete on ${formatDate(progress.completedAt)}. Every task is solved; you can keep practising and your progress is kept.`
            : progress.started
              ? `${progress.solved} of ${progress.total} tasks solved. Your work is saved in this browser; come back any time.`
              : 'Not started yet. Read the brief, look at the data, then start with Task 1. Your progress is saved as you go.'}
        </p>
        <ProgressBar done={progress.solved} total={progress.total} label={`${project.title} tasks solved`} />
      </div>

      {text && 'failed' in text && (
        <div className={styles.failure} role="alert">
          <p>The project brief could not be loaded. Check your connection and try again.</p>
          <Button variant="secondary" onClick={retryText}>
            Try again
          </Button>
        </div>
      )}
      {!text && (
        <p className={styles.loading} role="status">
          Loading the project brief…
        </p>
      )}

      {brief && (
        <>
          <div className={styles.briefGrid}>
            <Card title="Scenario" className={styles.wide}>
              <Prose html={section(brief, 'Scenario') ?? ''} />
            </Card>
            <Card title="The company">
              <Prose html={section(brief, 'The company') ?? ''} />
            </Card>
            <Card title="The problem">
              <Prose html={section(brief, 'The problem') ?? ''} />
            </Card>
            <Card title="Objectives" className={styles.wide}>
              <Prose html={section(brief, 'Objectives') ?? ''} />
            </Card>
          </div>

          <Card title="The data" description={`Every task runs on a fresh copy of the ${project.company} database, so nothing you try can change it.`} className={styles.block}>
            <Prose html={section(brief, 'The data') ?? ''} />
            <h3 className={styles.subheading}>Tables and columns</h3>
            <SchemaExplorer tables={engineUsable ? tables : null} />
            {engine.status === 'failed' && (
              <div className={styles.failure} role="alert">
                <p>{engine.failure}</p>
                <Button variant="secondary" onClick={() => void challengeEngine.retry().catch(() => undefined)}>
                  Try again
                </Button>
              </div>
            )}
          </Card>

          <Card title="Business questions" description="What the leadership team asked you to answer. Each one maps to tasks below." className={styles.block}>
            <Prose html={section(brief, 'Business questions') ?? ''} />
          </Card>
        </>
      )}

      <section className={styles.block} aria-labelledby="project-milestones">
        <h2 id="project-milestones" className={styles.sectionTitle}>
          Milestones
        </h2>
        <p className={styles.note}>
          Work through the tasks in order: each one builds on the last, and the final challenge brings them together. Every
          task is open at any time.
        </p>
        <ol className={styles.milestones}>
          {progress.milestones.map(({ milestone, tasks, solved, complete }, index) => (
            <li key={milestone.id} className={styles.milestone} data-complete={complete ? 'true' : undefined}>
              <div className={styles.milestoneHead}>
                <h3 className={styles.milestoneTitle}>
                  <span className={styles.milestoneNumber}>Milestone {index + 1}</span> {milestone.title}
                </h3>
                <ChapterState
                  status={{
                    state: complete ? 'complete' : solved > 0 ? 'in-progress' : 'not-started',
                    steps: { done: solved, total: tasks.length },
                    kind: 'project',
                  }}
                />
              </div>
              <p className={styles.milestoneGoal}>{milestone.goal}</p>
              <ol className={styles.tasks}>
                {tasks.map((task) => {
                  const solvedTask = isTaskSolved(task.id, record)
                  const isFinal = task.id === project.finalTaskId
                  return (
                    <li key={task.id} className={styles.task} data-solved={solvedTask ? 'true' : undefined}>
                      <Link to={projectTaskUrl(path.id, project.id, task.step)} className={styles.taskLink}>
                        <span className={styles.taskStep}>{isFinal ? 'Final challenge' : `Task ${task.step}`}</span>
                        {task.title}
                      </Link>
                      <span className={styles.taskMeta}>
                        {task.topic} · About {task.durationMinutes} min
                        {solvedTask && <span className={styles.solved}> · Solved</span>}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      {brief && (
        <>
          <Card title="Present your findings" className={styles.block}>
            <Prose html={section(brief, 'Present your findings') ?? ''} />
          </Card>

          {progress.completedAt ? (
            <>
              <Card title="Model findings" description="One way to present the results to the leadership team. Compare it with your own." className={styles.block}>
                <Prose html={section(brief, 'Model findings') ?? ''} />
              </Card>
              <Card title="What you accomplished" className={styles.block}>
                <div className={styles.badge}>
                  <CompletionBadge label="Project complete" />
                </div>
                <Prose html={section(brief, 'What you accomplished') ?? ''} />
              </Card>
            </>
          ) : (
            <Card title="Project summary" className={styles.block}>
              <p>
                Solve all {progress.total} tasks to complete the project. The model findings and a summary of what you
                accomplished open here then.{' '}
                {remaining === 1 ? 'One task to go.' : `${remaining} tasks to go.`}
              </p>
            </Card>
          )}
        </>
      )}

      <p className={styles.back}>
        <Link to={pathUrl(path.id)}>Back to the {path.title} path</Link>
      </p>
    </>
  )
}
