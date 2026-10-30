import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button.tsx'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation built on the native <dialog> element, which traps focus,
 * closes on Escape and makes the rest of the page inert. Focus starts on
 * Cancel, the safe choice.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
      <div className={styles.actions}>
        <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  )
}
