import type { ReactNode } from 'react'

export type IconName =
  | 'dashboard'
  | 'learn'
  | 'path'
  | 'practice'
  | 'challenges'
  | 'quiz'
  | 'reference'
  | 'settings'
  | 'feedback'
  | 'menu'
  | 'close'
  | 'logo'
  | 'check'
  | 'flame'

/* 24×24 stroke icons drawn for SQL Learner. */
const PATHS: Record<IconName, ReactNode> = {
  dashboard: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  learn: (
    <>
      <path d="M5 18.5v-13A2.5 2.5 0 0 1 7.5 3H19v13H7.5A2.5 2.5 0 0 0 5 18.5a2.5 2.5 0 0 0 2.5 2.5H19v-5" />
      <path d="M9 7.5h6" />
    </>
  ),
  practice: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9.5 3 2.5-3 2.5M12.5 15H17" />
    </>
  ),
  challenges: <path d="M6 21V4m0 0h11l-2.5 4L17 12H6" />,
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <path d="M12 17h.01" />
    </>
  ),
  // A winding route between a start point and a flag.
  path: (
    <>
      <circle cx="6" cy="18" r="2" />
      <path d="M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16" />
      <path d="M16 3v6m0-6h4l-1.2 1.5L20 6h-4" />
    </>
  ),
  reference: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M9.5 9.5V20" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  feedback: (
    <>
      <path d="M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4.5 4v-4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 8.5h8M8 12h5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  flame: <path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.6-2.6-6-4.1-8.8-.4 2-1.4 3.2-2.6 3.9C11.6 7.5 10.4 5 8.4 3c.2 3.2-2.9 5.8-2.9 10.4C5.5 17.9 8.1 21 12 21z" />,
  logo: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.75" />
      <path d="M5 6v12c0 1.5 3.1 2.75 7 2.75s7-1.25 7-2.75V6" />
      <path d="M5 12c0 1.5 3.1 2.75 7 2.75s7-1.25 7-2.75" stroke="var(--color-highlight)" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
}

/** Decorative icon. Always pair it with visible text or an accessible label on the parent. */
export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
