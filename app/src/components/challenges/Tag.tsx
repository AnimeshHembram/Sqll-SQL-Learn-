import type { ReactNode } from 'react'
import styles from './Tag.module.css'

/** A small label such as a topic or a duration. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}
