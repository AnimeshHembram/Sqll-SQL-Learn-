import { useState } from 'react'
import { NAV } from '../app/navigation.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { clearAllStored } from '../lib/storage.ts'
import styles from './SettingsPage.module.css'

type ClearStatus = 'idle' | 'cleared' | 'unavailable'

const STATUS_MESSAGES: Record<ClearStatus, string> = {
  idle: '',
  cleared: 'Saved data cleared.',
  unavailable: 'This browser is blocking storage, so SQL Learner has nothing saved here.',
}

export function SettingsPage() {
  const [status, setStatus] = useState<ClearStatus>('idle')

  return (
    <>
      <PageHeader title={NAV.settings.title} description={NAV.settings.description} />
      <div className={styles.stack}>
        <Card title="Appearance">
          <p>SQL Learner follows your device's light or dark mode.</p>
        </Card>
        <Card title="Your data">
          <p>
            SQL Learner remembers the last lesson you opened so the dashboard can take you back to it.
            This is saved only in this browser and is never sent anywhere.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setStatus(clearAllStored() ? 'cleared' : 'unavailable')}>
              Clear saved data
            </Button>
            <p role="status" className={styles.status}>
              {STATUS_MESSAGES[status]}
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
