import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonList } from '../components/content/LessonList.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { MODULES, describeModule, modulePath } from '../content/index.ts'
import { useProgress } from '../features/progress/progressStore.ts'
import { moduleCount } from '../features/progress/progressSummary.ts'
import styles from './LearnPage.module.css'

export function LearnPage() {
  const progress = useProgress()

  return (
    <>
      <PageHeader title={NAV.learn.title} description={NAV.learn.description} />

      {MODULES.length === 0 ? (
        <Card title="Modules">
          <EmptyState title="No modules yet">Lessons will be listed here as they are added.</EmptyState>
        </Card>
      ) : (
        <div className={styles.modules}>
          {MODULES.map((module) => {
            const count = moduleCount(module, progress)
            return (
              <Card key={module.id} title={module.title} description={describeModule(module)}>
                <p className={styles.summary}>{module.summary}</p>
                <div className={styles.progress}>
                  <p className={styles.progressText}>
                    {count.done} of {count.total} lessons complete
                  </p>
                  <ProgressBar done={count.done} total={count.total} label={`${module.title} lessons complete`} />
                </div>
                <LessonList module={module} />
                <p className={styles.overview}>
                  <Link to={modulePath(module.id)}>About this module</Link>
                </p>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
