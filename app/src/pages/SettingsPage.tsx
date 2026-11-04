import { useId, useRef, useState, type ChangeEvent } from 'react'
import { NAV } from '../app/navigation.ts'
import { plural } from '../components/progress/format.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import type { ProgressData } from '../features/progress/progressModel.ts'
import {
  exportProgress,
  parseProgressFile,
  reloadProgress,
  replaceProgress,
  resetProgress,
  useProgress,
} from '../features/progress/progressStore.ts'
import { clearAllStored, isStorageAvailable } from '../lib/storage.ts'
import { useFocusWhenDone } from '../lib/useFocusReturn.ts'
import styles from './SettingsPage.module.css'

/** Imported files larger than this are refused before reading: real progress files are a few kilobytes. */
const MAX_IMPORT_BYTES = 1_000_000

type Pending =
  | { kind: 'import'; progress: ProgressData; fileName: string }
  | { kind: 'reset' }
  | { kind: 'delete-all' }
  | null

/** For example "3 lessons, 5 challenges and 2 quizzes". */
function describeProgress(progress: ProgressData): string {
  const lessons = plural(Object.keys(progress.lessons).length, 'lesson')
  const challenges = plural(Object.values(progress.challenges).filter((item) => item.solvedAt).length, 'solved challenge')
  const quizzes = plural(Object.keys(progress.quizzes).length, 'finished quiz', 'finished quizzes')
  return `${lessons}, ${challenges} and ${quizzes}`
}

function isEmpty(progress: ProgressData): boolean {
  return (
    Object.keys(progress.lessons).length === 0 &&
    Object.keys(progress.challenges).length === 0 &&
    Object.keys(progress.quizzes).length === 0 &&
    Object.keys(progress.activity).length === 0
  )
}

export function SettingsPage() {
  const progress = useProgress()
  const [storageAvailable] = useState(isStorageAvailable)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const statusRef = useRef<HTMLParagraphElement>(null)
  // After "Reset progress" is confirmed, the dialog closes and tries to return focus to the button that
  // opened it, which is now disabled (there is nothing left to reset). Focus goes to the result message instead.
  useFocusWhenDone(pending === null, statusRef)

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sql-learner-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    // Give the browser a moment to start the download before the address is released.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Your progress file was downloaded.')
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Clear the input so choosing the same file again still triggers a change.
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage(`"${file.name}" is too large to be a SQL Learner progress file.`)
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setMessage(`"${file.name}" could not be read. Try choosing it again.`)
      return
    }
    const imported = parseProgressFile(text)
    if (!imported) {
      setMessage(`"${file.name}" is not a SQL Learner progress file, or it comes from a newer version of the app.`)
      return
    }
    setPending({ kind: 'import', progress: imported, fileName: file.name })
  }

  const confirm = () => {
    if (!pending) return
    if (pending.kind === 'import') {
      const saved = replaceProgress(pending.progress)
      setMessage(
        saved
          ? `Progress imported from "${pending.fileName}": ${describeProgress(pending.progress)}.`
          : 'Progress was imported for this visit, but this browser is blocking storage, so it will be lost on reload.',
      )
    } else if (pending.kind === 'reset') {
      resetProgress()
      setMessage('Your progress was reset.')
    } else {
      const cleared = clearAllStored()
      reloadProgress()
      setMessage(cleared ? 'All saved data was deleted.' : 'This browser is blocking storage, so SQL Learner has nothing saved here.')
    }
    setPending(null)
  }

  return (
    <>
      <PageHeader title={NAV.settings.title} description={NAV.settings.description} />
      <div className={styles.stack}>
        <Card title="Appearance">
          <p>SQL Learner follows your device's light or dark mode.</p>
        </Card>

        <Card title="Your progress">
          {!storageAvailable && (
            <p className={styles.warning} role="note">
              This browser is blocking storage, so progress is kept only until you reload or close this tab. Export your
              progress before leaving if you want to keep it.
            </p>
          )}
          <p>
            {isEmpty(progress)
              ? 'You have no saved progress yet.'
              : `Saved in this browser: ${describeProgress(progress)}, plus your learning streak.`}{' '}
            Progress is never sent anywhere. To move it to another browser or device, export it here and import the file
            there.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={download}>
              Export progress
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Import progress
            </Button>
            <label htmlFor={fileInputId} className="visually-hidden">
              Progress file to import
            </label>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              onChange={(event) => void chooseFile(event)}
            />
            <Button variant="secondary" onClick={() => setPending({ kind: 'reset' })} disabled={isEmpty(progress)}>
              Reset progress
            </Button>
          </div>
        </Card>

        <Card title="Your data">
          <p>
            Besides your progress, SQL Learner remembers the last lesson you opened so the dashboard can take you back to
            it. This is saved only in this browser and is never sent anywhere. Your practice database is not saved at all:
            it lives in this tab's memory and returns to the original data when you reload the page.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setPending({ kind: 'delete-all' })}>
              Delete all saved data
            </Button>
          </div>
        </Card>

        <p role="status" className={styles.status} ref={statusRef} tabIndex={-1}>
          {message}
        </p>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'import'
            ? 'Replace your progress?'
            : pending?.kind === 'reset'
              ? 'Reset your progress?'
              : 'Delete all saved data?'
        }
        confirmLabel={
          pending?.kind === 'import' ? 'Replace progress' : pending?.kind === 'reset' ? 'Reset progress' : 'Delete all data'
        }
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'import' ? (
          <>
            <p>
              "{pending.fileName}" contains {describeProgress(pending.progress)}.
            </p>
            <p>It will replace the progress saved in this browser ({describeProgress(progress)}). This cannot be undone.</p>
          </>
        ) : pending?.kind === 'reset' ? (
          <p>
            This removes your completed lessons, solved challenges, quiz scores and streak from this browser. Export your
            progress first if you might want it back.
          </p>
        ) : (
          <p>
            This removes everything SQL Learner has saved in this browser: your progress and the last lesson you opened.
            This cannot be undone.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
