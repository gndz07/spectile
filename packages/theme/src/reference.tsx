import { useOperation } from "@spectile/react"
import { useEffect, useRef } from "react"
import { useTheme } from "./context"
import { useHashNavigation } from "./hash"
import { OperationPage } from "./operation"
import { Sidebar } from "./sidebar"
import { StackedReference } from "./stacked"
import { TopBar } from "./top-bar"

/** Brings the element's top back into view when `key` changes while the reader is scrolled past it. */
const useScrollToTop = (key: string | undefined) => {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useRef(key)
  useEffect(() => {
    if (shown.current === key) return
    shown.current = key
    const element = ref.current
    if (element && element.getBoundingClientRect().top < 0) {
      element.scrollIntoView?.({ block: "start" })
    }
  }, [key])
  return ref
}

const SidebarReference = () => {
  useHashNavigation()
  const ref = useScrollToTop(useOperation()?.id)
  return (
    <div ref={ref} className="spectile-sidebar-layout">
      {useTheme().navigation === "drawer" ? <TopBar /> : <Sidebar />}
      <OperationPage />
    </div>
  )
}

/** The docs once the model is ready. */
export const Reference = () =>
  useTheme().layout === "stacked" ? <StackedReference /> : <SidebarReference />
