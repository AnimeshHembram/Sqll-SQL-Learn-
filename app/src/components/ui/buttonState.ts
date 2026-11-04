/**
 * The interaction rules for Button, kept free of React and the DOM so
 * scripts/test-interactions.ts can check them in Node.
 */

export interface ButtonStateInput {
  /** The action this button started is still running. */
  busy: boolean
  /** The button cannot be used at all (for example, there is no SQL to run). */
  disabled: boolean
  /** Enter or Space is held down on the button. */
  keyPressed: boolean
}

export interface ButtonState {
  /** Whether a click, tap, Enter or Space should run the action. */
  activatable: boolean
  /** Native `disabled`: not focusable, not clickable, dimmed. Only for buttons that cannot be used, never for "busy". */
  disabled: boolean
  /** `aria-busy`: announced as busy; the spinner is shown. */
  ariaBusy: boolean
  /**
   * `aria-disabled` while busy: the button keeps focus (a keyboard user who
   * pressed it stays on it) but is announced as unavailable and ignores activation.
   */
  ariaDisabled: boolean
  /** Shows the pressed style for a keyboard press, matching :active for pointer presses. */
  pressed: boolean
}

export function buttonState({ busy, disabled, keyPressed }: ButtonStateInput): ButtonState {
  const activatable = !busy && !disabled
  return {
    activatable,
    disabled,
    ariaBusy: busy,
    ariaDisabled: busy && !disabled,
    pressed: keyPressed && activatable,
  }
}

/** Keys that activate a native button: Enter (on key down) and Space (on key up). */
export function isActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}

/**
 * A key the browser repeats while it is held down. Enter on a button and
 * Ctrl+Enter (Cmd+Enter) in the editor act once per press, so repeats are
 * ignored: holding the key must not run a query again and again.
 */
export function isRepeatedEnter(key: string, repeat: boolean): boolean {
  return key === 'Enter' && repeat
}
