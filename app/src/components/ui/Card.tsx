import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'
import styles from './Card.module.css'

interface CardProps {
  /** Section heading, rendered as <h2> unless headingLevel says otherwise. */
  title: string
  /** For a card nested inside another titled section, so headings keep their outline. */
  headingLevel?: 2 | 3 | 4
  description?: string
  children: ReactNode
  /** Extra class for layout, for example spanning grid columns. */
  className?: string
}

/** A titled content section. Used for every block of page content. */
export function Card({ title, description, children, className, headingLevel = 2 }: CardProps) {
  const headingId = useId()
  const Heading = `h${headingLevel}` as const

  return (
    <section className={cx(styles.card, className)} aria-labelledby={headingId}>
      <div className={styles.head}>
        <Heading id={headingId} className={styles.title}>
          {title}
        </Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {children}
    </section>
  )
}
