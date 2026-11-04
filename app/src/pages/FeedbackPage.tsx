import { useId, useRef, useState, type FormEvent } from 'react'
import { NAV } from '../app/navigation.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import {
  FEEDBACK_KINDS,
  MAX_DETAILS_LENGTH,
  MAX_SUMMARY_LENGTH,
  issueUrl,
  type FeedbackKind,
} from '../features/feedback/issueUrl.ts'
import styles from './FeedbackPage.module.css'

function whereOpened(): string {
  return window.location.protocol === 'file:' ? 'from disk (file://)' : window.location.origin
}

export function FeedbackPage() {
  const [kind, setKind] = useState<FeedbackKind>('problem')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [error, setError] = useState('')
  // The link last opened, kept so it can be opened again if the browser blocked the new tab.
  const [openedUrl, setOpenedUrl] = useState<string | null>(null)
  const summaryRef = useRef<HTMLInputElement>(null)
  const ids = { kind: useId(), summary: useId(), details: useId(), context: useId(), error: useId() }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (summary.trim() === '') {
      setError('Write a short summary first.')
      summaryRef.current?.focus()
      return
    }
    setError('')
    const url = issueUrl({
      kind,
      summary,
      details,
      context: includeContext ? { userAgent: navigator.userAgent, opened: whereOpened() } : null,
    })
    const opened = window.open(url, '_blank')
    if (opened) opened.opener = null
    setOpenedUrl(url)
  }

  return (
    <>
      <PageHeader title={NAV.feedback.title} description={NAV.feedback.description} />
      <div className={styles.stack}>
        <Card title="Send feedback">
          <p className={styles.intro}>
            Found a bug, a confusing lesson or a wrong answer? Have an idea? Fill this in and press the button: a
            pre-filled issue opens on GitHub, where you can check it and submit it. SQL Learner itself sends nothing.
            Submitting needs a free GitHub account.
          </p>

          <form className={styles.form} onSubmit={submit} noValidate>
            <div className={styles.field}>
              <label htmlFor={ids.kind}>What is it about?</label>
              <select id={ids.kind} value={kind} onChange={(event) => setKind(event.target.value as FeedbackKind)}>
                {(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((key) => (
                  <option key={key} value={key}>
                    {FEEDBACK_KINDS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor={ids.summary}>Summary</label>
              <input
                ref={summaryRef}
                id={ids.summary}
                type="text"
                value={summary}
                maxLength={MAX_SUMMARY_LENGTH}
                placeholder="For example: the Run button does nothing on my phone"
                aria-invalid={error !== '' || undefined}
                aria-describedby={error ? ids.error : undefined}
                onChange={(event) => setSummary(event.target.value)}
              />
              {error && (
                <p id={ids.error} className={styles.error}>
                  {error}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor={ids.details}>Details (optional)</label>
              <textarea
                id={ids.details}
                value={details}
                rows={6}
                maxLength={MAX_DETAILS_LENGTH}
                placeholder="What did you do, what did you expect, and what happened? Include the SQL if it helps."
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>

            <div className={styles.check}>
              <input
                id={ids.context}
                type="checkbox"
                checked={includeContext}
                onChange={(event) => setIncludeContext(event.target.checked)}
              />
              <label htmlFor={ids.context}>Include my browser version (helps with fixing problems)</label>
            </div>

            <div className={styles.actions}>
              <Button type="submit">Continue on GitHub</Button>
            </div>
          </form>

          <p role="status" className={styles.status}>
            {openedUrl && (
              <>
                GitHub opened in a new tab. Nothing is sent until you submit the issue there. If no tab opened,{' '}
                <a href={openedUrl} target="_blank" rel="noopener noreferrer">
                  open the pre-filled issue
                </a>
                .
              </>
            )}
          </p>
        </Card>
      </div>
    </>
  )
}
