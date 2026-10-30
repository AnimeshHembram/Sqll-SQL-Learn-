import type { ReactNode } from 'react'
import { PAGE_TITLE_ID } from '../../app/focus.ts'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  description?: string
  /** Browser tab title, if it should differ from the visible heading. */
  documentTitle?: string
  /** Buttons or links shown under the description. */
  actions?: ReactNode
}

/** Page heading, description and browser tab title. Every page renders exactly one. */
export function PageHeader({ title, description, documentTitle = title, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <title>{`${documentTitle} | SQL Learner`}</title>
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className={styles.title}>
        {title}
      </h1>
      {description && <p className={styles.description}>{description}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
