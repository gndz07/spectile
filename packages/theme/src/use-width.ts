import { type RefObject, useLayoutEffect, useState } from "react"
import { BREAKPOINTS } from "./layout"

/** The element's width, kept current with a ResizeObserver. Wide until first measured. */
export const useWidth = (ref: RefObject<HTMLElement | null>) => {
  const [width, setWidth] = useState<number>(BREAKPOINTS.wide)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.getBoundingClientRect().width || BREAKPOINTS.wide)
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}
