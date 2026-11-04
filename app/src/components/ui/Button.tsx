import { useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from 'react'
import { Link } from 'react-router'
import { cx } from '../../lib/cx.ts'
import { buttonState, isActivationKey, isRepeatedEnter } from './buttonState.ts'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'medium' | 'small'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

/** Renders a router link styled as a button: use for navigation. */
interface LinkButtonProps extends CommonProps {
  to: string
}

/** Renders a native <button>: use for actions on the current page. */
interface ActionButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  to?: never
  /**
   * The action this button started is still running. The button shows a
   * spinner and ignores activation, but stays focusable: a keyboard user who
   * pressed it keeps their place instead of focus jumping to the top of the
   * page, as it would if the button became `disabled`.
   */
  busy?: boolean
  ref?: Ref<HTMLButtonElement>
}

export type ButtonProps = LinkButtonProps | ActionButtonProps

export function Button(props: ButtonProps) {
  const [keyPressed, setKeyPressed] = useState(false)
  const className = cx(styles.button, styles[props.variant ?? 'primary'], props.size === 'small' && styles.small)

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={className}>
        {props.children}
      </Link>
    )
  }

  const { variant, size, children, type = 'button', busy = false, disabled = false, onClick, onKeyDown, onKeyUp, onBlur, ...buttonProps } =
    props
  void variant
  void size
  const state = buttonState({ busy, disabled, keyPressed })

  return (
    <button
      {...buttonProps}
      type={type}
      className={className}
      disabled={state.disabled}
      aria-busy={state.ariaBusy || undefined}
      aria-disabled={state.ariaDisabled || undefined}
      // Keyboard presses show the same pressed state as a pointer press (:active only covers Space, and only in some browsers).
      data-pressed={state.pressed ? '' : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (!state.activatable) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      onKeyDown={(event) => {
        // Holding Enter makes the browser repeat the key, and each repeat would click again
        // (running a quick query over and over). One press, one action.
        if (isRepeatedEnter(event.key, event.repeat)) {
          event.preventDefault()
          return
        }
        if (isActivationKey(event.key)) setKeyPressed(true)
        onKeyDown?.(event)
      }}
      onKeyUp={(event) => {
        if (isActivationKey(event.key)) setKeyPressed(false)
        onKeyUp?.(event)
      }}
      onBlur={(event) => {
        setKeyPressed(false)
        onBlur?.(event)
      }}
    >
      {busy && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  )
}
