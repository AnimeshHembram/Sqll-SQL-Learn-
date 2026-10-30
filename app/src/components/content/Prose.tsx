import styles from './Prose.module.css'

interface ProseProps {
  /**
   * HTML generated at build time from the Markdown files in src/content.
   * The build rejects raw HTML in those files, so this only ever contains
   * markup produced by the Markdown converter.
   */
  html: string
}

/** Reading-friendly styles for lesson text, tables and code. */
export function Prose({ html }: ProseProps) {
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
}
