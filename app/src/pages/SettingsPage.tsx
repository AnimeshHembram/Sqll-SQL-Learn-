import { NAV } from '../app/navigation.ts'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  return (
    <>
      <PageHeader title={NAV.settings.title} description={NAV.settings.description} />
      <div className={styles.stack}>
        <Card title="Appearance">
          <p>SQL Learner follows your device's light or dark mode.</p>
        </Card>
        <Card title="Your data">
          <p>
            SQL Learner does not save anything yet. When progress tracking is added, it will be
            stored only in this browser.
          </p>
        </Card>
      </div>
    </>
  )
}
