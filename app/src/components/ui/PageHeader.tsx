import { useEffect, useRef, type ReactNode } from 'react'
import { PAGE_TITLE_ID, takePendingTitleFocus } from '../../app/focus.ts'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  description?: string
  /** Browser tab title, if it should differ from the visible heading. */
  documentTitle?: string
  /** Small supporting detail under the description, such as a lesson's length. */
  meta?: string
  /** Buttons or links shown under the description. */
  actions?: ReactNode
}

/** Page heading, description and browser tab title. Every page renders exactly one. */
export function PageHeader({ title, description, documentTitle = title, meta, actions }: PageHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  // After navigating to a page that loads lazily, focus arrives once the heading exists.
  useEffect(() => {
    if (takePendingTitleFocus()) titleRef.current?.focus()
  }, [])

  return (
    <header className={styles.header}>
      <title>{`${documentTitle} | SQL Learner`}</title>
      <h1 ref={titleRef} id={PAGE_TITLE_ID} tabIndex={-1} className={styles.title}>
        {title}
      </h1>
      {description && <p className={styles.description}>{description}</p>}
      {meta && <p className={styles.meta}>{meta}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
