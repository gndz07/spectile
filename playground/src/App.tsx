import {
  type MediaType,
  type NormalizedOperation,
  type OpenAPIDocument,
  type SecurityScheme,
  type SpecModel,
  normalize,
} from "@spectile/core"
import { schemaTypeLabel } from "@spectile/headless"
import {
  ExternalDocs,
  Info,
  Navigation,
  Operation,
  Parameter,
  RequestBody,
  Response,
  Schema,
  SpectileProvider,
  TryIt,
  useNavigation,
  useOperation,
  useOperationContext,
  useRequestBody,
  useSchema,
  useSpectile,
  useTryItContext,
} from "@spectile/react"
import { type FormEvent, useState } from "react"
import ReactMarkdown from "react-markdown"
import example from "./example.json"

const renderMarkdown = (markdown: string) => <ReactMarkdown>{markdown}</ReactMarkdown>

type Loaded = { model: SpecModel; specUrl?: string }

const loadModel = async (specUrl: string): Promise<Loaded> => {
  const { loadSpec } = await import("@spectile/core/loader")
  return { model: normalize((await loadSpec(specUrl)).document), specUrl }
}

const SpecForm = ({ onLoad }: { onLoad: (url: string) => void }) => {
  const [url, setUrl] = useState("")
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (url) onLoad(url)
  }
  return (
    <form className="spec-form" onSubmit={submit}>
      <input
        type="url"
        placeholder="Load an OpenAPI URL"
        aria-label="OpenAPI URL"
        value={url}
        onChange={(event) => setUrl(event.currentTarget.value)}
      />
      <button type="submit">Load</button>
    </form>
  )
}

const DocsLink = ({ externalDocs }: Pick<ExternalDocs.RootProps, "externalDocs">) => (
  <ExternalDocs.Root externalDocs={externalDocs} className="external-docs">
    <ExternalDocs.Description className="description" />
    <ExternalDocs.Link target="_blank" rel="noreferrer">
      Docs ↗
    </ExternalDocs.Link>
  </ExternalDocs.Root>
)

const Sidebar = () => (
  <nav className="sidebar">
    <Info.Description className="description" />
    <DocsLink externalDocs={useSpectile().model.externalDocs} />
    <Navigation.Search placeholder="Search operations" aria-label="Search operations" />
    <p className="muted">{useNavigation().resultCount} operations</p>
    <Navigation.Groups>
      {(group) => (
        <Navigation.Group group={group} asChild>
          <section>
            <h2>{group.tag ? <Navigation.GroupName /> : "Other"}</h2>
            <Navigation.GroupDescription className="description" />
            <DocsLink externalDocs={group.tag?.externalDocs} />
            <ul>
              {group.operations.map((operation) => (
                <li key={operation.id}>
                  <Navigation.Item operation={operation} className="nav-item">
                    <Operation.Method className="method" />
                    {operation.summary ?? operation.path}
                  </Navigation.Item>
                </li>
              ))}
            </ul>
          </section>
        </Navigation.Group>
      )}
    </Navigation.Groups>
  </nav>
)

const RootType = () => (
  <code className="type">{schemaTypeLabel(useSchema().root, useSpectile().model)}</code>
)

const SchemaView = ({ media }: { media: MediaType }) =>
  media.schema ? (
    <Schema.Root schema={media.schema} defaultExpandedDepth={1}>
      <p className="muted">
        {media.mediaType} · <RootType />
      </p>
      <Schema.Tree className="schema-tree" aria-label={`${media.mediaType} schema`}>
        <Schema.Rows>
          {(row) => (
            <Schema.Row row={row} className="schema-row">
              <Schema.Indicator className="chevron">▸</Schema.Indicator>
              <Schema.Name className="name" />
              <Schema.Type className="type" />
              <Schema.Required className="required" />
              <Schema.Description className="description" />
            </Schema.Row>
          )}
        </Schema.Rows>
      </Schema.Tree>
    </Schema.Root>
  ) : null

const MediaList = ({ content }: { content: MediaType[] }) =>
  content.map((media) => <SchemaView key={media.mediaType} media={media} />)

const RequestBodyContent = () => <MediaList content={useRequestBody().content} />

const ParameterView = ({ parameter }: Pick<Parameter.RootProps, "parameter">) => (
  <Parameter.Root parameter={parameter} asChild>
    <li>
      <Parameter.Name asChild>
        <code />
      </Parameter.Name>{" "}
      <Parameter.Location className="muted" />
      <Parameter.Type className="type" />
      <Parameter.Required className="required" />
      <Parameter.Description className="description" />
    </li>
  </Parameter.Root>
)

const isBasic = (scheme: SecurityScheme) =>
  scheme.type === "http" && scheme.scheme.toLowerCase() === "basic"

const CredentialFields = ({ scheme }: { scheme: SecurityScheme }) => {
  if (scheme.type === "mutualTLS") return null
  if (isBasic(scheme)) {
    return (
      <>
        <label>
          {scheme.name} username
          <TryIt.Credential scheme={scheme.name} field="username" autoComplete="off" />
        </label>
        <label>
          {scheme.name} password
          <TryIt.Credential scheme={scheme.name} field="password" type="password" />
        </label>
      </>
    )
  }
  return (
    <label>
      {scheme.name} <span className="muted">{scheme.type === "apiKey" ? "API key" : "token"}</span>
      <TryIt.Credential scheme={scheme.name} type="password" autoComplete="off" />
    </label>
  )
}

const ServerFields = () => {
  const { servers } = useOperationContext()
  const { serverVariables } = useTryItContext()
  return (
    <div className="fields">
      {servers.length > 1 && (
        <label>
          Server
          <TryIt.ServerSelect />
        </label>
      )}
      {Object.keys(serverVariables).map((name) => (
        <label key={name}>
          {name} <span className="muted">server variable</span>
          <TryIt.ServerVariable name={name} />
        </label>
      ))}
      <label>
        Server URL
        <TryIt.Server />
      </label>
    </div>
  )
}

const TryItPanel = ({ operation }: { operation: NormalizedOperation }) => {
  const { model } = useSpectile()
  return (
    <section className="try-it">
      <h2>Try it</h2>
      <div className="fields">
        {model.securitySchemes.map((scheme) => (
          <CredentialFields key={scheme.name} scheme={scheme} />
        ))}
      </div>
      <TryIt.Root className="try-it-form">
        <ServerFields />
        <div className="fields">
          {operation.parameters.map((parameter) => (
            <label key={`${parameter.in}.${parameter.name}`}>
              {parameter.name} <span className="muted">{parameter.in}</span>
              <TryIt.Parameter parameter={parameter} />
            </label>
          ))}
        </div>
        <TryIt.Body className="body-input" rows={10} spellCheck={false} aria-label="Request body" />
        <TryIt.Send className="send">Send</TryIt.Send>
        <TryIt.Curl asChild>
          <pre className="code" />
        </TryIt.Curl>
        <TryIt.Error className="error" />
        <TryIt.Status className="status" />
        <TryIt.ResponseBody asChild>
          <pre className="code" />
        </TryIt.ResponseBody>
      </TryIt.Root>
    </section>
  )
}

const OperationView = () => {
  const operation = useOperation()
  if (!operation) return <p className="muted">Select an operation</p>
  const { parameters, responses } = operation
  return (
    <Operation.Root key={operation.id} className="operation">
      <header>
        <Operation.Method className="method" /> <Operation.Path className="path" />
      </header>
      <h1>
        <Operation.Summary />
      </h1>
      <Operation.Description className="description" />
      <DocsLink externalDocs={operation.externalDocs} />

      {parameters.length > 0 && (
        <section>
          <h2>Parameters</h2>
          <ul className="parameters">
            {parameters.map((parameter) => (
              <ParameterView key={`${parameter.in}:${parameter.name}`} parameter={parameter} />
            ))}
          </ul>
        </section>
      )}

      <RequestBody.Root asChild>
        <section>
          <h2>
            Request body <RequestBody.Required className="required" />
          </h2>
          <RequestBody.Description className="description" />
          <RequestBodyContent />
        </section>
      </RequestBody.Root>

      <section>
        <h2>Responses</h2>
        {responses.map((response) => (
          <Response.Root key={response.status} response={response} className="response">
            <h3>
              <Response.Status />
            </h3>
            <Response.Description className="description" />
            {response.headers.length > 0 && (
              <ul className="parameters">
                {response.headers.map((header) => (
                  <ParameterView key={header.name} parameter={header} />
                ))}
              </ul>
            )}
            <MediaList content={response.content} />
          </Response.Root>
        ))}
      </section>

      <TryItPanel operation={operation} />
    </Operation.Root>
  )
}

export const App = () => {
  const [loaded, setLoaded] = useState<Loaded>(() => ({
    model: normalize(example as OpenAPIDocument),
  }))
  const [error, setError] = useState<string>()
  const { model } = loaded

  const load = (url: string) =>
    loadModel(url).then(
      (next) => {
        setLoaded(next)
        setError(undefined)
      },
      (reason: unknown) => setError(String(reason)),
    )

  return (
    <SpectileProvider
      model={model}
      defaultActiveId={model.operations[0]?.id}
      tryIt={{ baseUrl: loaded.specUrl }}
      renderMarkdown={renderMarkdown}
    >
      <div className="app">
        <header className="topbar">
          <Info.Title asChild>
            <strong />
          </Info.Title>
          <SpecForm onLoad={(url) => void load(url)} />
          <a href="/unstyled.html">Unstyled</a>
        </header>
        {error && <p role="alert">{error}</p>}
        <div className="layout">
          <Sidebar />
          <main>
            <OperationView />
          </main>
        </div>
      </div>
    </SpectileProvider>
  )
}
