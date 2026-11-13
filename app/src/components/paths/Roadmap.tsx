import { useId } from 'react'
import { Link } from 'react-router'
import { findLesson, lessonPath } from '../../content/index.ts'
import type { CareerPath, PathChapter } from '../../content/paths/catalog.ts'
import { chapterExerciseCount, chapterUrl } from '../../content/paths/chapters.ts'
import { chapterStatus, stageChapterCount, type PathContext } from '../../features/paths/pathSummary.ts'
import type { ProgressData } from '../../features/progress/progressModel.ts'
import { isLessonComplete } from '../../features/progress/progressSummary.ts'
import { ChapterState } from './ChapterState.tsx'
import styles from './Roadmap.module.css'

interface RoadmapProps {
  path: CareerPath
  progress: ProgressData
  context: PathContext
}

/**
 * A path's stages in order, with a stage list to jump between them, and every
 * chapter of every stage. Jumping uses buttons that scroll and move focus,
 * not #fragment links: the offline build uses the # part of the address for routing.
 */
export function Roadmap({ path, progress, context }: RoadmapProps) {
  const baseId = useId()
  const stageId = (id: string) => `${baseId}-stage-${id}`

  const jumpTo = (id: string) => {
    const heading = document.getElementById(stageId(id))
    if (!heading) return
    heading.scrollIntoView({ block: 'start' })
    heading.focus({ preventScroll: true })
  }

  return (
    <div className={styles.roadmap}>
      <nav aria-label="Stages" className={styles.stageNav}>
        <ol className={styles.stageList}>
          {path.stages.map((stage, index) => {
            const count = stageChapterCount(stage, progress, context)
            return (
              <li key={stage.id}>
                <button type="button" className={styles.stageButton} onClick={() => jumpTo(stage.id)}>
                  <span className={styles.stageNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className={styles.stageText}>
                    <span className={styles.stageName}>
                      <span className="visually-hidden">Stage {index + 1}: </span>
                      {stage.title}
                    </span>
                    <span className={styles.stageCount}>
                      {count.total > 0 ? `${count.done} of ${count.total} ready chapters complete` : 'All chapters planned'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className={styles.stages}>
        {path.stages.map((stage, index) => (
          <section key={stage.id} className={styles.stage} aria-labelledby={stageId(stage.id)}>
            <h2 id={stageId(stage.id)} tabIndex={-1} className={styles.stageHeading}>
              <span className={styles.stageLabel}>Stage {index + 1}</span> {stage.title}
            </h2>
            <p className={styles.stageSummary}>{stage.summary}</p>
            <ol className={styles.chapters}>
              {stage.chapters.map((chapter) => (
                <ChapterItem key={chapter.id} pathId={path.id} chapter={chapter} progress={progress} context={context} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}

interface ChapterItemProps {
  pathId: string
  chapter: PathChapter
  progress: ProgressData
  context: PathContext
}

function ChapterItem({ pathId, chapter, progress, context }: ChapterItemProps) {
  const status = chapterStatus(chapter, progress, context)
  const planned = status.state === 'planned'
  const written = status.kind === 'written'
  return (
    <li className={styles.chapter} data-planned={planned || undefined}>
      <div className={styles.chapterHead}>
        <h3 className={styles.chapterTitle}>{written ? <Link to={chapterUrl(pathId, chapter.id)}>{chapter.title}</Link> : chapter.title}</h3>
        <ChapterState status={status} />
      </div>
      <p className={styles.chapterSummary}>{chapter.summary}</p>
      {written ? (
        <p className={styles.writtenNote}>
          Chapter with runnable examples, {chapterExerciseCount(pathId, chapter.id)} exercises and a quiz.
        </p>
      ) : planned ? (
        <p className={styles.plannedNote}>Not written yet. It does not count towards your progress.</p>
      ) : (
        <ul className={styles.lessons} aria-label={`Lessons in ${chapter.title}`}>
          {chapter.lessons.map((ref) => {
            const found = findLesson(ref.moduleId, ref.lessonId)
            if (!found) return null
            const done = isLessonComplete(progress, ref.moduleId, ref.lessonId)
            return (
              <li key={`${ref.moduleId}/${ref.lessonId}`} data-completed={done || undefined}>
                <Link to={lessonPath(ref.moduleId, ref.lessonId)}>{found.lesson.title}</Link>
                {done && <span className="visually-hidden"> (completed)</span>}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
