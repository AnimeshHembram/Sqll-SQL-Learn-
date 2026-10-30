import type { Ref } from 'react'
import { IconButton } from '../ui/IconButton.tsx'
import { Brand } from './Brand.tsx'
import styles from './Header.module.css'

interface HeaderProps {
  sidebarId: string
  navOpen: boolean
  onOpenNav: () => void
  menuButtonRef: Ref<HTMLButtonElement>
}

/** Top bar shown below the desktop breakpoint, where the sidebar becomes a drawer. */
export function Header({ sidebarId, navOpen, onOpenNav, menuButtonRef }: HeaderProps) {
  return (
    <header className={styles.header} inert={navOpen}>
      <IconButton
        icon="menu"
        label="Open navigation"
        onClick={onOpenNav}
        buttonRef={menuButtonRef}
        aria-expanded={navOpen}
        aria-controls={sidebarId}
      />
      <Brand />
    </header>
  )
}
