'use client'

import { useEffect, useRef } from 'react'

/**
 * The behavior a dialog has to have, separate from what one looks like.
 *
 * Modal owns the panel that small dialogs share, but several screens need a
 * layout it cannot give them: the moderation review is two columns under a
 * sticky footer, the watermark generator is a canvas, the record editor is a
 * generated form. Each grew its own overlay, and each was missing a different
 * piece. Escape did nothing in five of them, the page behind kept scrolling,
 * and focus stayed wherever it was, so opening one with a keyboard put the
 * cursor nowhere and closing it dropped the reader at the top of the document.
 *
 * The look is allowed to differ. This is the part that is not.
 *
 * `onClose` is held in a ref rather than named as a dependency. Callers pass an
 * inline arrow, so its identity changes on every render of the parent, and an
 * effect keyed on it re-ran mid-interaction: it pulled focus back to the close
 * button while somebody was typing, which is what made confirming a delete
 * from the keyboard bounce off the Cancel button it had just left.
 */
export function useDialogBehavior({
  open,
  onClose,
  initialFocus,
}: {
  open: boolean
  onClose: () => void
  /** Focused on open. Defaults to the panel, which needs tabIndex={-1}. */
  initialFocus?: React.RefObject<HTMLElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const initialFocusRef = useRef(initialFocus)

  // Refreshed on every render, and declared before the effect below so it has
  // already run by the time that one opens the dialog.
  useEffect(() => {
    onCloseRef.current = onClose
    initialFocusRef.current = initialFocus
  })

  useEffect(() => {
    if (!open) return

    // Remembered before focus moves, so it can be handed back on close.
    const opener = document.activeElement as HTMLElement | null
    ;(initialFocusRef.current?.current ?? panelRef.current)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [open])

  return panelRef
}
