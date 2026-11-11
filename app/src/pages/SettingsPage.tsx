import { useId, useRef, useState, type ChangeEvent } from 'react'
import { NAV } from '../app/navigation.ts'
import { plural } from '../components/progress/format.ts'
import { ThemePicker } from '../components/settings/ThemePicker.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { clearChallengeSessions } from '../features/challenges/challengeSession.ts'
import type { PathProgressData } from '../features/paths/pathModel.ts'
import {
  getPathProgress,
  reloadPathProgress,
  replacePathProgress,
  resetPathProgress,
  usePathProgress,
} from '../features/paths/pathStore.ts'
import {
  buildProgressFile,
  describePathProgress,
  isPathProgressEmpty,
  parseProgressFileText,
} from '../features/progress/progressFile.ts'
import type { ProgressData } from '../features/progress/progressModel.ts'
import {
  getProgress,
  reloadProgress,
  replaceProgress,
  resetProgress,
  useProgress,
} from '../features/progress/progressStore.ts'
import { DEFAULT_THEME, THEMES, applyTheme, readTheme, saveTheme, type ThemeId } from '../features/theme/theme.ts'
import { clearAllStored, isStorageAvailable } from '../lib/storage.ts'
import { useFocusWhenDone } from '../lib/useFocusReturn.ts'
import styles from './SettingsPage.module.css'

/** Imported files larger than this are refused before reading: real progress files are a few kilobytes. */
const MAX_IMPORT_BYTES = 1_000_000

type Pending =
  | { kind: 'import'; progress: ProgressData; paths: PathProgressData | null; fileName: string }
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
  const pathProgress = usePathProgress()
  const nothingSaved = isEmpty(progress) && isPathProgressEmpty(pathProgress)
  const [storageAvailable] = useState(isStorageAvailable)
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState<ThemeId>(readTheme)
  const [pending, setPending] = useState<Pending>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const statusRef = useRef<HTMLParagraphElement>(null)
  // After "Reset progress" is confirmed, the dialog closes and tries to return focus to the button that
  // opened it, which is now disabled (there is nothing left to reset). Focus goes to the result message instead.
  useFocusWhenDone(pending === null, statusRef)

  const download = () => {
    const blob = new Blob([buildProgressFile(getProgress(), getPathProgress())], { type: 'application/json' })
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
    const imported = parseProgressFileText(text)
    if (!imported) {
      setMessage(`"${file.name}" is not a SQL Learner progress file, or it comes from a newer version of the app.`)
      return
    }
    setPending({ kind: 'import', progress: imported.progress, paths: imported.paths, fileName: file.name })
  }

  const chooseTheme = (next: ThemeId) => {
    const saved = saveTheme(next)
    setTheme(next)
    const label = THEMES.find((item) => item.id === next)?.label ?? next
    setMessage(
      saved
        ? `Theme changed to ${label}.`
        : `Theme changed to ${label} for this visit. This browser is blocking storage, so it will not be remembered.`,
    )
  }

  const confirm = () => {
    if (!pending) return
    // Every option below changes saved progress, so this visit's unsaved challenge and exercise state is forgotten too.
    clearChallengeSessions()
    if (pending.kind === 'import') {
      const savedLearn = replaceProgress(pending.progress)
      const savedPaths = pending.paths ? replacePathProgress(pending.paths) : true
      const pathsNote = pending.paths
        ? ` SQL Path: ${describePathProgress(pending.paths)}.`
        : ' The file has no SQL Path progress (it was exported before SQL Path was added), so your SQL Path progress was kept.'
      setMessage(
        savedLearn && savedPaths
          ? `Progress imported from "${pending.fileName}": ${describeProgress(pending.progress)}.${pathsNote}`
          : 'Progress was imported for this visit, but this browser is blocking storage, so it will be lost on reload.',
      )
    } else if (pending.kind === 'reset') {
      resetProgress()
      resetPathProgress()
      setMessage('Your progress was reset, including SQL Path progress and saved drafts.')
    } else {
      const cleared = clearAllStored()
      reloadProgress()
      reloadPathProgress()
      applyTheme(DEFAULT_THEME)
      setTheme(DEFAULT_THEME)
      setMessage(cleared ? 'All saved data was deleted.' : 'This browser is blocking storage, so SQL Learner has nothing saved here.')
    }
    setPending(null)
  }

  return (
    <>
      <PageHeader title={NAV.settings.title} description={NAV.settings.description} />
      <div className={styles.stack}>
        <Card title="Appearance">
          <p>Choose how SQL Learner looks. Your choice applies to every page and is saved in this browser.</p>
          <ThemePicker value={theme} onChange={chooseTheme} />
        </Card>

        <Card title="Your progress">
          {!storageAvailable && (
            <p className={styles.warning} role="note">
              This browser is blocking storage, so progress is kept only until you reload or close this tab. Export your
              progress before leaving if you want to keep it.
            </p>
          )}
          <p>
            {nothingSaved
              ? 'You have no saved progress yet.'
              : `Saved in this browser: ${describeProgress(progress)}, plus your learning streak. SQL Path: ${describePathProgress(pathProgress)}.`}{' '}
            Progress is never sent anywhere. To move it to another browser or device, export it here and import the file
            there. The file includes your Learn SQL and SQL Path progress.
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
            <Button variant="secondary" onClick={() => setPending({ kind: 'reset' })} disabled={nothingSaved}>
              Reset progress
            </Button>
          </div>
        </Card>

        <Card title="Your data">
          <p>
            Besides your progress, SQL Learner remembers the last lesson you opened so the dashboard can take you back to
            it, the theme you chose, and the unsubmitted queries in SQL Path exercises and daily problems (drafts, which are
            not exported). These are saved only in this browser and are never sent anywhere. Your practice database is not saved at all:
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
              "{pending.fileName}" contains {describeProgress(pending.progress)}.{' '}
              {pending.paths
                ? `SQL Path: ${describePathProgress(pending.paths)}.`
                : 'It has no SQL Path progress, so your SQL Path progress will be kept.'}
            </p>
            <p>
              It will replace the progress saved in this browser ({describeProgress(progress)}
              {pending.paths ? `; SQL Path: ${describePathProgress(pathProgress)}` : ''}). This cannot be undone.
            </p>
          </>
        ) : pending?.kind === 'reset' ? (
          <p>
            This removes your completed lessons, solved challenges, quiz scores and streak, and all SQL Path progress
            (chapters, exercises, daily problems, streaks and badges) and saved drafts, from this browser. Your theme is
            kept. Export your progress first if you might want it back.
          </p>
        ) : (
          <p>
            This removes everything SQL Learner has saved in this browser: your Learn SQL and SQL Path progress, saved
            drafts, the last lesson you opened and your theme. This cannot be undone.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
