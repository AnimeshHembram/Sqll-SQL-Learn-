import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../../lib/cx.ts'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary'

interface CommonProps {
  variant?: ButtonVariant
  children: ReactNode
}

/** Renders a router link styled as a button: use for navigation. */
interface LinkButtonProps extends CommonProps {
  to: string
}

/** Renders a native <button>: use for actions on the current page. */
interface ActionButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  to?: never
}

export function Button(props: LinkButtonProps | ActionButtonProps) {
  const className = cx(styles.button, styles[props.variant ?? 'primary'])

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={className}>
        {props.children}
      </Link>
    )
  }

  const { variant, children, type = 'button', ...buttonProps } = props
  void variant

  return (
    <button {...buttonProps} type={type} className={className}>
      {children}
    </button>
  )
}
