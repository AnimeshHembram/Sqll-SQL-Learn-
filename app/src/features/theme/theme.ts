import { readStored, subscribeStored, writeStored } from '../../lib/storage.ts'

/**
 * The app's colour themes. Each id matches a [data-theme] block in
 * src/styles/tokens.css, which sets every colour the app uses.
 */
export const THEMES = [
  { id: 'original', label: 'Original', description: "SQL Learner's blue colours. Light or dark, following your device." },
  { id: 'black', label: 'Black', description: 'Black backgrounds with light text, easy on the eyes at night.' },
  { id: 'white', label: 'White', description: 'Plain white pages and a light sidebar, always light.' },
  { id: 'purple', label: 'Purple', description: 'Lavender pages with a deep purple sidebar and accents.' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'original'

/** Versioned so the saved shape can change later without misreading old data. */
const KEY = 'theme:v1'

function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

/** The saved theme, or the default if none is saved (or storage is blocked). */
export function readTheme(): ThemeId {
  const stored = readStored(KEY)
  return isThemeId(stored) ? stored : DEFAULT_THEME
}

/** Shows the app in a theme by setting data-theme on <html>. */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement
  root.dataset.theme = theme
  // Match the browser's own toolbar (on phones) to the sidebar colour of the theme.
  const sidebar = getComputedStyle(root).getPropertyValue('--color-sidebar').trim()
  if (sidebar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sidebar)
}

/** Applies a theme and remembers it in this browser. Returns false if it could not be saved. */
export function saveTheme(theme: ThemeId): boolean {
  applyTheme(theme)
  return writeStored(KEY, theme)
}

/** Applies the saved theme now, and again whenever another tab changes or clears it. */
export function startTheme(): void {
  applyTheme(readTheme())
  subscribeStored(KEY, () => applyTheme(readTheme()))
}
