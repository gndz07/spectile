import { Operation, TryIt, useOperationContext, useTryItContext } from "@spectile/react"
import { useState } from "react"
import { SectionTitle } from "./bits"
import { useTheme } from "./context"
import { CloseButton, Dialog } from "./dialog"
import { ExampleView } from "./examples"
import { PlayIcon } from "./icons"
import { useOperationUi } from "./operation-state"
import { TryItSheet } from "./sheet"
import { Tabs } from "./tabs"
import { CurlPreview, TryItFields } from "./try-it"

const ResponseExample = () => {
  const { responses } = useOperationContext()
  const { exampleStatus, showExample } = useOperationUi()
  const response = responses.find(({ status }) => status === exampleStatus) ?? responses[0]
  if (!response) return null
  const [media] = response.content
  return (
    <section className="spectile-panel-section">
      <div className="spectile-panel-section-header">
        <h3 className="spectile-panel-section-title">Response</h3>
        <select
          className="spectile-select"
          data-size="small"
          aria-label="Response status"
          value={response.status}
          onChange={(event) => showExample(event.currentTarget.value)}
        >
          {responses.map(({ status }) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      {media ? (
        <ExampleView key={response.status} media={media} usage="response" label="response" />
      ) : (
        <p className="spectile-muted">No content</p>
      )}
    </section>
  )
}

const RequestExample = () => {
  const { requestBody, kind } = useOperationContext()
  const { draft } = useTryItContext()
  const media =
    requestBody?.content.find(({ mediaType }) => mediaType === draft.mediaType) ??
    requestBody?.content[0]
  if (!media && kind === "webhook") return null
  return (
    <section className="spectile-panel-section">
      <h3 className="spectile-panel-section-title">Request</h3>
      {media && <ExampleView media={media} usage="request" label="request body" />}
      {kind === "operation" && <CurlPreview copy />}
    </section>
  )
}

const PanelExample = () => (
  <>
    <RequestExample />
    <ResponseExample />
  </>
)

type PanelTab = "example" | "try-it"

const PANEL_LABEL = "Example and try it"

/** The panel while no operation is open, in the stacked layout. */
export const EmptyPanel = () => (
  <aside className="spectile-panel" aria-label={PANEL_LABEL}>
    <p className="spectile-panel-empty spectile-muted">
      Open an operation to see an example and try it.
    </p>
  </aside>
)

/** The right-hand column: Example (default) and Try it tabs. It never switches tabs by itself. */
export const Panel = () => {
  const [tab, setTab] = useState<PanelTab>("example")
  const { kind } = useOperationContext()
  return (
    <aside className="spectile-panel" aria-label={PANEL_LABEL}>
      <TryIt.Root className="spectile-try-it" data-placement="panel" noValidate>
        {kind === "webhook" ? (
          <PanelExample />
        ) : (
          <Tabs
            label={PANEL_LABEL}
            selected={tab}
            onSelect={setTab}
            tabs={[
              { value: "example", label: "Example" },
              { value: "try-it", label: "Try it" },
            ]}
          >
            {tab === "example" ? <PanelExample /> : <TryItFields />}
          </Tabs>
        )}
      </TryIt.Root>
    </aside>
  )
}

export const TryItDrawer = () => {
  const { tryItOpen, setTryItOpen } = useOperationUi()
  const close = () => setTryItOpen(false)
  return (
    <Dialog open={tryItOpen} onClose={close} label="Try it" className="spectile-drawer">
      <header className="spectile-overlay-header">
        <h2 className="spectile-overlay-title">Try it</h2>
        <Operation.Method className="spectile-method" />
        <CloseButton onClick={close} />
      </header>
      <TryIt.Root className="spectile-try-it" data-placement="drawer" noValidate>
        <TryItFields />
      </TryIt.Root>
    </Dialog>
  )
}

export const InlineTryIt = () => {
  const { tryItOpen, setTryItOpen } = useOperationUi()
  if (!tryItOpen) return null
  return (
    <section className="spectile-inline-try-it" aria-label="Try it">
      <header className="spectile-overlay-header">
        <SectionTitle className="spectile-overlay-title">Try it</SectionTitle>
        <CloseButton onClick={() => setTryItOpen(false)} />
      </header>
      <TryIt.Root className="spectile-try-it" data-placement="inline" noValidate>
        <TryItFields />
      </TryIt.Root>
    </section>
  )
}

/** Opens the drawer or inline form; nothing in panel mode, with try-it off, or for webhooks. */
export const TryItButton = () => {
  const { tryIt } = useTheme()
  const { kind } = useOperationContext()
  const { tryItOpen, setTryItOpen } = useOperationUi()
  if (!tryIt || tryIt === "panel" || kind === "webhook") return null
  return (
    <button
      type="button"
      className="spectile-button spectile-try-it-button"
      data-variant="accent"
      aria-expanded={tryIt === "inline" ? tryItOpen : undefined}
      onClick={() => setTryItOpen(!tryItOpen)}
    >
      <PlayIcon /> Try it
    </button>
  )
}

const PLACEMENTS = { inline: InlineTryIt, drawer: TryItDrawer, sheet: TryItSheet }

/** The drawer, sheet or inline form for the resolved placement; the panel sits beside the page. */
export const TryItPlacement = () => {
  const { tryIt } = useTheme()
  const { kind } = useOperationContext()
  if (kind === "webhook" || !tryIt || tryIt === "panel") return null
  const Placement = PLACEMENTS[tryIt]
  return <Placement />
}
