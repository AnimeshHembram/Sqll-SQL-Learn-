import type { ReactNode } from 'react'

export type IconName =
  | 'dashboard'
  | 'learn'
  | 'practice'
  | 'challenges'
  | 'reference'
  | 'settings'
  | 'menu'
  | 'close'
  | 'logo'

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
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
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
