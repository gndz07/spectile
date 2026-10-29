import type { NormalizedOperation } from "@spectile/core"
import { defaultExampleResponse } from "@spectile/headless"
import { type ReactNode, createContext, useContext, useState } from "react"

export type OperationUi = {
  /** The response the panel's Example tab shows. */
  exampleStatus?: string
  showExample: (status: string) => void
  /** The drawer, sheet or inline form is open. */
  tryItOpen: boolean
  setTryItOpen: (open: boolean) => void
}

const OperationUiContext = createContext<OperationUi | undefined>(undefined)

/** UI state for one operation; remount it with a `key` per operation to start fresh. */
export const OperationUiProvider = ({
  operation,
  children,
}: {
  operation: NormalizedOperation
  children: ReactNode
}) => {
  const [exampleStatus, showExample] = useState(() => defaultExampleResponse(operation)?.status)
  const [tryItOpen, setTryItOpen] = useState(false)
  return (
    <OperationUiContext value={{ exampleStatus, showExample, tryItOpen, setTryItOpen }}>
      {children}
    </OperationUiContext>
  )
}

export const useOperationUi = () => {
  const ui = useContext(OperationUiContext)
  if (!ui) throw new Error("Missing <OperationUiProvider>")
  return ui
}
