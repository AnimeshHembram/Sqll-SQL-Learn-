import { Link } from 'react-router'
import styles from './Breadcrumbs.module.css'

interface Crumb {
  label: string
  to: string
}

interface BreadcrumbsProps {
  /** Parent pages, from the top level down. The current page is the <h1>, so it is not listed. */
  items: Crumb[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.to} className={styles.item}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
