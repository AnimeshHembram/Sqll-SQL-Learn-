import type { Ref } from 'react'
import { cx } from '../../lib/cx.ts'
import { Icon, type IconName } from './Icon.tsx'
import styles from './IconButton.module.css'

interface IconButtonProps {
  icon: IconName
  /** Accessible name, read by screen readers. */
  label: string
  onClick: () => void
  buttonRef?: Ref<HTMLButtonElement>
  /** Extra class for layout (for example, hiding on desktop). */
  className?: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
}

/** Square icon-only button for the dark navigation surfaces (header and sidebar). */
export function IconButton({ icon, label, buttonRef, className, ...buttonProps }: IconButtonProps) {
  return (
    <button
      {...buttonProps}
      ref={buttonRef}
      type="button"
      aria-label={label}
      className={cx(styles.iconButton, className)}
    >
      <Icon name={icon} size={22} />
    </button>
  )
}
