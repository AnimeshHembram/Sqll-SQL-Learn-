import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'
import styles from './Card.module.css'

interface CardProps {
  /** Section heading (rendered as <h2>). */
  title: string
  description?: string
  children: ReactNode
  /** Extra class for layout, for example spanning grid columns. */
  className?: string
}

/** A titled content section. Used for every block of page content. */
export function Card({ title, description, children, className }: CardProps) {
  const headingId = useId()

  return (
    <section className={cx(styles.card, className)} aria-labelledby={headingId}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {children}
    </section>
  )
}
