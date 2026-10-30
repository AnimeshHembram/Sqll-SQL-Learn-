import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { MAIN_CONTENT_ID, focusElementById, focusPageTitle } from '../../app/focus.ts'
import { Header } from './Header.tsx'
import { Sidebar } from './Sidebar.tsx'
import styles from './AppShell.module.css'

const SIDEBAR_ID = 'app-sidebar'
const DESKTOP_QUERY = '(min-width: 64rem)'

/** Layout for every page: sidebar navigation, mobile header and the main content area. */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)

  // After client-side navigation, move focus to the new page's heading so
  // screen-reader and keyboard users know the page changed.
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      focusPageTitle()
    }
  }, [pathname])

  // The header is inert while the drawer is open, so focus can only return to
  // the menu button after the drawer has closed and the header is active again.
  const returnFocusToMenu = useRef(false)

  const closeNavAndReturnFocus = useCallback(() => {
    returnFocusToMenu.current = true
    setNavOpen(false)
  }, [])

  useEffect(() => {
    if (!navOpen && returnFocusToMenu.current) {
      returnFocusToMenu.current = false
      menuButtonRef.current?.focus()
    }
  }, [navOpen])

  // Drawer behaviour: Escape closes it, and the page behind it does not scroll.
  useEffect(() => {
    if (!navOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNavAndReturnFocus()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [navOpen, closeNavAndReturnFocus])

  // Close the drawer if the window grows to desktop width while it is open.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setNavOpen(false)
    }
    desktop.addEventListener('change', handleChange)
    return () => desktop.removeEventListener('change', handleChange)
  }, [])

  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    focusElementById(MAIN_CONTENT_ID)
  }

  return (
    <div className={styles.shell}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink} onClick={skipToContent}>
        Skip to main content
      </a>

      <Header
        sidebarId={SIDEBAR_ID}
        navOpen={navOpen}
        onOpenNav={() => setNavOpen(true)}
        menuButtonRef={menuButtonRef}
      />

      <Sidebar
        id={SIDEBAR_ID}
        open={navOpen}
        onClose={closeNavAndReturnFocus}
        onNavigate={() => setNavOpen(false)}
      />

      {navOpen && <div className={styles.backdrop} onClick={closeNavAndReturnFocus} aria-hidden="true" />}

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main} inert={navOpen}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      <ScrollRestoration />
    </div>
  )
}
