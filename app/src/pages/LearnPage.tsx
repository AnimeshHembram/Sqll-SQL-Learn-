import { Link } from 'react-router'
import { NAV } from '../app/navigation.ts'
import { LessonList } from '../components/content/LessonList.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { MODULES, describeModule, modulePath } from '../content/index.ts'
import styles from './LearnPage.module.css'

export function LearnPage() {
  return (
    <>
      <PageHeader title={NAV.learn.title} description={NAV.learn.description} />

      {MODULES.length === 0 ? (
        <Card title="Modules">
          <EmptyState title="No modules yet">Lessons will be listed here as they are added.</EmptyState>
        </Card>
      ) : (
        <div className={styles.modules}>
          {MODULES.map((module) => (
            <Card key={module.id} title={module.title} description={describeModule(module)}>
              <p className={styles.summary}>{module.summary}</p>
              <LessonList module={module} />
              <p className={styles.overview}>
                <Link to={modulePath(module.id)}>About this module</Link>
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
