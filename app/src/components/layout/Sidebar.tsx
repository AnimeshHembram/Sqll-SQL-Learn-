import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '../../app/navigation.ts'
import { cx } from '../../lib/cx.ts'
import { Icon } from '../ui/Icon.tsx'
import { IconButton } from '../ui/IconButton.tsx'
import { Brand } from './Brand.tsx'
import styles from './Sidebar.module.css'

interface SidebarProps {
  id: string
  /** Drawer state below the desktop breakpoint. Ignored on desktop, where the sidebar is always shown. */
  open: boolean
  onClose: () => void
  onNavigate: () => void
}

export function Sidebar({ id, open, onClose, onNavigate }: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Move focus into the drawer when it opens so keyboard users land inside it.
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus()
    }
  }, [open])

  return (
    <aside id={id} className={cx(styles.sidebar, open && styles.open)} aria-label="Sidebar">
      <div className={styles.top}>
        <Brand onNavigate={onNavigate} />
        <IconButton
          icon="close"
          label="Close navigation"
          onClick={onClose}
          buttonRef={closeButtonRef}
          className={styles.closeButton}
        />
      </div>

      <nav aria-label="Main" className={styles.nav}>
        <NavList items={PRIMARY_NAV} onNavigate={onNavigate} />
        <NavList items={SECONDARY_NAV} onNavigate={onNavigate} className={styles.secondary} />
      </nav>
    </aside>
  )
}

interface NavListProps {
  items: readonly NavItem[]
  onNavigate: () => void
  className?: string
}

function NavList({ items, onNavigate, className }: NavListProps) {
  return (
    <ul className={cx(styles.list, className)}>
      {items.map((item) => (
        <li key={item.path}>
          <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) => cx(styles.link, isActive && styles.active)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
