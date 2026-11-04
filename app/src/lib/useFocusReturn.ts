import { useEffect, useRef, type FocusEvent, type RefObject } from 'react'

/**
 * For a control that exists only while something runs, such as a Stop button.
 *
 * When `active` turns false the control disappears, and if it had focus the
 * browser drops focus to the top of the page. This hook moves focus to
 * `target` instead (for example the Run button), so keyboard and screen-reader
 * users stay where they were. Spread the returned handlers onto the control.
 */
export function useFocusReturn(active: boolean, target: RefObject<HTMLElement | null>) {
  const hadFocus = useRef(false)

  useEffect(() => {
    if (active || !hadFocus.current) return
    hadFocus.current = false
    if (isFocusLost()) target.current?.focus()
  }, [active, target])

  return {
    onFocus: () => {
      hadFocus.current = true
    },
    onBlur: (event: FocusEvent) => {
      // Focus moved to another control on purpose. (A control removed while focused gives no related target.)
      if (event.relatedTarget) hadFocus.current = false
    },
  }
}

/**
 * True when keyboard focus is somewhere the user cannot continue from: dropped
 * to <body>, left on a control that is now disabled, or left inside a dialog
 * that has closed.
 */
export function isFocusLost(): boolean {
  const active = document.activeElement
  if (active === null || active === document.body) return true
  if (active instanceof HTMLButtonElement && active.disabled) return true
  return active.closest('dialog:not([open])') !== null
}

/**
 * For a button that disappears or becomes disabled once it has done its job,
 * such as "Check answer" or "Show the solution".
 *
 * When `done` turns true and focus was lost as a result, focus moves to
 * `target` (usually the content the button revealed, made focusable with
 * tabIndex={-1}). Keyboard users then continue from there instead of from the
 * top of the page. Focus that is still somewhere sensible is left alone.
 */
export function useFocusWhenDone(done: boolean, target: RefObject<HTMLElement | null>) {
  const previous = useRef(done)

  useEffect(() => {
    const changed = previous.current !== done
    previous.current = done
    if (changed && done && isFocusLost()) target.current?.focus()
  }, [done, target])
}
