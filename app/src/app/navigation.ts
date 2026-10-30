import type { IconName } from '../components/ui/Icon.tsx'

export interface NavItem {
  /** Absolute route path. */
  path: string
  /** Short label used in the sidebar. */
  label: string
  /** Page heading. */
  title: string
  /** One-sentence summary shown under the page heading. */
  description: string
  icon: IconName
}

/**
 * Single source of truth for the app's sections.
 * The router, sidebar, page headings and dashboard all read from here.
 */
export const NAV = {
  dashboard: {
    path: '/',
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'Your starting point for learning SQL.',
    icon: 'dashboard',
  },
  learn: {
    path: '/learn',
    label: 'Learn SQL',
    title: 'Learn SQL',
    description: 'Structured lessons that take you from your first query to joins and beyond.',
    icon: 'learn',
  },
  practice: {
    path: '/practice',
    label: 'Practice',
    title: 'Practice',
    description: 'A space to write your own queries against sample data.',
    icon: 'practice',
  },
  challenges: {
    path: '/challenges',
    label: 'Challenges',
    title: 'Challenges',
    description: 'Exercises that check your answer and show you where to improve.',
    icon: 'challenges',
  },
  reference: {
    path: '/reference',
    label: 'SQL Reference',
    title: 'SQL Reference',
    description: 'Syntax and examples for the SQL statements you will use most.',
    icon: 'reference',
  },
  settings: {
    path: '/settings',
    label: 'Settings',
    title: 'Settings',
    description: 'Preferences for how SQL Learner looks and behaves.',
    icon: 'settings',
  },
} as const satisfies Record<string, NavItem>

/** Main sidebar links, in learning order. */
export const PRIMARY_NAV: readonly NavItem[] = [
  NAV.dashboard,
  NAV.learn,
  NAV.practice,
  NAV.challenges,
  NAV.reference,
]

/** Links pinned to the bottom of the sidebar. */
export const SECONDARY_NAV: readonly NavItem[] = [NAV.settings]
