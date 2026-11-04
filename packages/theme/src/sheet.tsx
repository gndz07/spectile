import { Operation, TryIt, useOperationContext, useTryItContext } from "@spectile/react"
import { useState } from "react"
import { CloseButton, Dialog } from "./dialog"
import { useOperationUi } from "./operation-state"
import { Tabs } from "./tabs"
import { SendButton, TryItActions, TryItRequest, TryItResponse } from "./try-it"

type SheetTab = "request" | "response"

const WAITING = { idle: "Send the request to see its response.", pending: "Sending…" }

const Response = () => {
  const { status } = useTryItContext().result
  return (
    <>
      {(status === "idle" || status === "pending") && (
        <p className="spectile-muted">{WAITING[status]}</p>
      )}
      <TryItResponse />
    </>
  )
}

/** The phone's try-it: Request and Response tabs over a footer that stays at the bottom. */
export const TryItSheet = () => {
  const { tryItOpen, setTryItOpen } = useOperationUi()
  const { summary, path } = useOperationContext()
  const [tab, setTab] = useState<SheetTab>("request")
  const close = () => setTryItOpen(false)
  return (
    <Dialog open={tryItOpen} onClose={close} label="Try it" className="spectile-sheet">
      <span className="spectile-sheet-handle" aria-hidden />
      <header className="spectile-overlay-header">
        <Operation.Method className="spectile-method" />
        <h2 className="spectile-overlay-title">{summary ?? path}</h2>
        <CloseButton onClick={close} />
      </header>
      <TryIt.Root
        className="spectile-try-it"
        data-placement="sheet"
        noValidate
        onSubmit={() => setTab("response")}
      >
        <Tabs
          className="spectile-sheet-tabs"
          label="Try it"
          selected={tab}
          onSelect={setTab}
          tabs={[
            { value: "request", label: "Request" },
            { value: "response", label: "Response" },
          ]}
        >
          {tab === "request" ? <TryItRequest /> : <Response />}
        </Tabs>
        <footer className="spectile-sheet-footer">
          {tab === "request" ? (
            <TryItActions />
          ) : (
            <div className="spectile-actions">
              <button type="button" className="spectile-button" onClick={() => setTab("request")}>
                Edit request
              </button>
              <SendButton>Send again</SendButton>
            </div>
          )}
        </footer>
      </TryIt.Root>
    </Dialog>
  )
}
