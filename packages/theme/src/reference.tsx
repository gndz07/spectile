import { useTheme } from "./context"
import { useHashNavigation } from "./hash"
import { OperationPage } from "./operation"
import { Sidebar } from "./sidebar"
import { StackedReference } from "./stacked"

const SidebarReference = () => {
  useHashNavigation()
  return (
    <div className="spectile-sidebar-layout">
      <Sidebar />
      <OperationPage />
    </div>
  )
}

/** The docs once the model is ready. */
export const Reference = () =>
  useTheme().layout === "stacked" ? <StackedReference /> : <SidebarReference />
