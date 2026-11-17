import {
  Operation,
  RequestBody,
  useOperation,
  useOperationContext,
  useRequestBody,
  useRequestBodyMedia,
} from "@spectile/react"
import { DocsLink, SectionTitle, Tag, mediaTypeLabel } from "./bits"
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

/** "Request body · JSON · required". */
const RequestBodyHeading = () => {
  const { required, content } = useRequestBody()
  const [single] = content
  return (
    <div className="spectile-section-heading">
      <SectionTitle>Request body</SectionTitle>
      {content.length > 1 ? (
        <RequestBody.MediaSelect
          className="spectile-select"
          data-size="small"
          aria-label="Content type"
        />
      ) : (
        single && <span className="spectile-media-type">{mediaTypeLabel(single.mediaType)}</span>
      )}
      {required && <Tag tone="required">required</Tag>}
    </div>
  )
}

/** The heading, then the body's description, then its fields. */
const RequestBodyContent = () => {
  const media = useRequestBodyMedia()
  const description = <RequestBody.Description className="spectile-description spectile-prose" />
  return media?.schema ? (
    <SchemaView
      key={media.mediaType}
      schema={media.schema}
      label="Request body schema"
      header={<RequestBodyHeading />}
      intro={description}
      usage="request"
    />
  ) : (
    <>
      <RequestBodyHeading />
      {description}
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
      <TryItPlacement />
      <RequestDetails />
      <Responses responses={responses} />
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
