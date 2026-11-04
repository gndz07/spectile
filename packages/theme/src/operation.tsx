import {
  Operation,
  RequestBody,
  useOperation,
  useOperationContext,
  useRequestBody,
  useRequestBodyMedia,
} from "@spectile/react"
import { DocsLink, SectionTitle, Tag } from "./bits"
import { useTheme } from "./context"
import { OperationUiProvider } from "./operation-state"
import { Parameters } from "./parameters"
import { Panel, TryItButton, TryItPlacement } from "./placements"
import { Responses } from "./responses"
import { SchemaView } from "./schema"

const PLACEHOLDER = /(\{[^}]+\})/

/** The path with `{placeholders}` marked, so they can take the accent color. */
export const OperationPath = () => (
  <code className="spectile-path">
    {useOperationContext()
      .path.split(PLACEHOLDER)
      .map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="spectile-placeholder">
            {part}
          </span>
        ) : (
          part
        ),
      )}
  </code>
)

const OperationHeader = () => {
  const { summary, path, deprecated, kind, externalDocs } = useOperationContext()
  return (
    <header className="spectile-operation-header">
      <div className="spectile-title-row">
        <h1 className="spectile-operation-title">{summary ?? path}</h1>
        {deprecated && <Tag tone="deprecated">deprecated</Tag>}
      </div>
      <TryItButton />
      <div className="spectile-operation-line">
        {kind === "webhook" && <Tag tone="webhook">Webhook</Tag>}
        <Operation.Method className="spectile-method" />
        <OperationPath />
      </div>
      <Operation.Description className="spectile-operation-description spectile-prose" />
      <DocsLink externalDocs={externalDocs} />
    </header>
  )
}

const RequestBodyHeading = () => {
  const { required, content } = useRequestBody()
  return (
    <div className="spectile-section-heading">
      <SectionTitle>Request body</SectionTitle>
      {required && <Tag tone="required">required</Tag>}
      {content.length > 1 ? (
        <RequestBody.MediaSelect className="spectile-select" aria-label="Content type" />
      ) : (
        <span className="spectile-media-type">{content[0]?.mediaType}</span>
      )}
    </div>
  )
}

const RequestBodyContent = () => {
  const media = useRequestBodyMedia()
  return (
    <>
      <RequestBody.Description className="spectile-description spectile-prose" />
      {media?.schema ? (
        <SchemaView
          key={media.mediaType}
          schema={media.schema}
          label="Request body schema"
          header={<RequestBodyHeading />}
        />
      ) : (
        <RequestBodyHeading />
      )}
    </>
  )
}

const RequestBodySection = () => (
  <RequestBody.Root asChild>
    <section className="spectile-section">
      <RequestBodyContent />
    </section>
  </RequestBody.Root>
)

export const RequestDetails = () => {
  const { parameters } = useOperationContext()
  return (
    <>
      <Parameters parameters={parameters} />
      <RequestBodySection />
    </>
  )
}

const OperationDetails = () => {
  const { responses } = useOperationContext()
  return (
    <>
      <RequestDetails />
      <Responses responses={responses} />
      <TryItPlacement />
    </>
  )
}

/** The active operation as a page, with the panel beside it when there is room. */
export const OperationPage = () => {
  const operation = useOperation()
  const { tryIt } = useTheme()
  if (!operation) return null
  return (
    <OperationUiProvider key={operation.id} operation={operation}>
      <Operation.Root operation={operation} className="spectile-operation-page">
        <main className="spectile-content">
          <OperationHeader />
          <OperationDetails />
        </main>
        {tryIt === "panel" && <Panel />}
      </Operation.Root>
    </OperationUiProvider>
  )
}
