import { Link } from 'react-router'
import { NAV } from '../../app/navigation.ts'
import { Icon } from '../ui/Icon.tsx'
import styles from './Brand.module.css'

interface BrandProps {
  onNavigate?: () => void
}

/** App name and logo, linking to the dashboard. Sits on the dark navigation surface. */
export function Brand({ onNavigate }: BrandProps) {
  return (
    <Link to={NAV.dashboard.path} className={styles.brand} onClick={onNavigate}>
      <Icon name="logo" size={26} />
      <span>SQL Learner</span>
    </Link>
  )
}
