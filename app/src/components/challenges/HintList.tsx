import { useRef } from 'react'
import { useFocusWhenDone } from '../../lib/useFocusReturn.ts'
import { Button } from '../ui/Button.tsx'
import { Card } from '../ui/Card.tsx'
import styles from './HintList.module.css'

interface HintListProps {
  /** Hints as HTML generated at build time from the challenge file. */
  hints: string[]
  /** How many hints are visible. */
  shown: number
  onShowNext: () => void
  /** Heading level of the "Hints" title: 2 on its own page, deeper inside an exercise. */
  headingLevel?: 2 | 3 | 4
}

/** Hints revealed one at a time, from a gentle nudge to almost the answer. Shown hints are counted in the learner's progress where the page saves it. */
export function HintList({ hints, shown, onShowNext, headingLevel = 2 }: HintListProps) {
  const visible = hints.slice(0, shown)
  const allShown = shown >= hints.length
  const lastHintRef = useRef<HTMLLIElement>(null)
  // The button disappears after the last hint; keyboard users continue from that hint, not the top of the page.
  useFocusWhenDone(allShown, lastHintRef)

  return (
    <Card title="Hints" headingLevel={headingLevel} description={`Hints used: ${shown} of ${hints.length}. Each hint gives away a little more.`}>
      {visible.length > 0 && (
        <ol className={styles.list}>
          {visible.map((hint, index) => (
            <li
              key={index}
              className={styles.hint}
              ref={index === visible.length - 1 ? lastHintRef : undefined}
              tabIndex={index === visible.length - 1 ? -1 : undefined}
            >
              <span className={styles.number}>Hint {index + 1}</span>
              {/* Built from the challenge's Markdown, which the build checks for unsafe content. */}
              <span dangerouslySetInnerHTML={{ __html: hint }} />
            </li>
          ))}
        </ol>
      )}
      <div aria-live="polite" className="visually-hidden">
        {visible.length > 0 ? `Hint ${visible.length} shown.` : ''}
      </div>
      {allShown ? (
        <p className={styles.note}>You have seen every hint.</p>
      ) : (
        <Button variant="secondary" onClick={onShowNext}>
          {shown === 0 ? 'Show the first hint' : `Show hint ${shown + 1} of ${hints.length}`}
        </Button>
      )}
    </Card>
  )
}
