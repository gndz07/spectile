import { type ReactNode, useLayoutEffect, useRef } from "react"

type DialogProps = {
  open: boolean
  onClose: () => void
  label: string
  className: string
  children: ReactNode
}

/**
 * A modal `<dialog>`: the browser traps focus and closes it on Escape; a click on the scrim
 * closes it too, and focus goes back to whatever was focused before it opened.
 */
export const Dialog = ({ open, onClose, label, className, children }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const opener = dialog.ownerDocument.activeElement as HTMLElement | null
    if (typeof dialog.showModal === "function") dialog.showModal()
    else dialog.setAttribute("open", "")
    return () => {
      if (typeof dialog.close === "function") dialog.close()
      else dialog.removeAttribute("open")
      opener?.focus()
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={className}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && <div className="spectile-dialog-body">{children}</div>}
    </dialog>
  )
}
