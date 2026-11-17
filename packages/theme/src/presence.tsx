import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react"
import { ChevronIcon } from "./icons"

/**
 * Whether to render something that is `open`, or closing: after `open` turns false it stays true
 * until the element's own transitions and animations finish.
 */
export const usePresence = (open: boolean, ref: RefObject<Element | null>) => {
  const [rendered, setRendered] = useState(open)
  if (open && !rendered) setRendered(true)
  useEffect(() => {
    if (open || !rendered) return
    const closing = ref.current?.getAnimations?.() ?? []
    if (closing.length === 0) return setRendered(false)
    let current = true
    Promise.allSettled(closing.map((animation) => animation.finished)).then(() => {
      if (current) setRendered(false)
    })
    return () => {
      current = false
    }
  }, [open, rendered, ref])
  return rendered
}

/** Content that grows open and shrinks closed. Content open from the start appears without growing. */
export const Collapse = ({ open, children }: { open: boolean; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [initial, setInitial] = useState(open)
  if (initial && !open) setInitial(false)
  if (!usePresence(open, ref)) return null
  return (
    <div
      ref={ref}
      className="spectile-collapse"
      data-state={open ? "open" : "closed"}
      data-initial={initial ? "" : undefined}
    >
      <div className="spectile-collapse-inner">{children}</div>
    </div>
  )
}

/** A chevron button that grows `children` open below it; closed at first. */
export const Disclosure = ({
  label,
  children,
}: {
  label: ReactNode | ((open: boolean) => ReactNode)
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="spectile-collapsible" data-state={open ? "open" : "closed"}>
      <button
        type="button"
        className="spectile-disclosure"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ChevronIcon />
        {typeof label === "function" ? label(open) : label}
      </button>
      <Collapse open={open}>{children}</Collapse>
    </div>
  )
}
