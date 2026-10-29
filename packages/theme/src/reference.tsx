import { useHashNavigation } from "./hash"
import { OperationPage } from "./operation"
import { Sidebar } from "./sidebar"

/** The docs once the model is ready. */
export const Reference = () => {
  useHashNavigation()
  return (
    <div className="spectile-sidebar-layout">
      <Sidebar />
      <OperationPage />
    </div>
  )
}
