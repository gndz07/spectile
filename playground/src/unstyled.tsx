import { type MediaType, type OpenAPIDocument, normalize } from "@spectile/core"
import {
  Operation,
  Schema,
  SpectileProvider,
  TryIt,
  useNavigation,
  useOperation,
  useTryItContext,
} from "@spectile/react"
import example from "./example.json"
import { mount } from "./mount"

const model = normalize(example as OpenAPIDocument)

const Sidebar = () => {
  const { groups, getSearchProps, getItemProps } = useNavigation()
  return (
    <nav>
      <input {...getSearchProps()} aria-label="Search" />
      {groups.map(({ kind, tag, operations }) => (
        <section key={`${kind}:${tag?.name ?? ""}`}>
          <h2>{tag?.name ?? (kind === "webhook" ? "Webhooks" : "Other")}</h2>
          {operations.map((operation) => (
            <button key={operation.id} {...getItemProps(operation)}>
              {operation.summary ?? operation.path}
            </button>
          ))}
        </section>
      ))}
    </nav>
  )
}

const SchemaView = ({ media }: { media: MediaType }) =>
  media.schema ? (
    <Schema.Root schema={media.schema} defaultExpandedDepth={1}>
      <Schema.Tree aria-label={media.mediaType}>
        <Schema.Rows>
          {(row) => (
            <Schema.Row row={row}>
              <Schema.Indicator>▸</Schema.Indicator>
              <Schema.Name /> <Schema.Type /> <Schema.Required /> <Schema.Description />
            </Schema.Row>
          )}
        </Schema.Rows>
      </Schema.Tree>
    </Schema.Root>
  ) : null

const BodyFields = () =>
  useTryItContext().bodyFields.map((field) => (
    <label key={field.name}>
      {field.name} <TryIt.Field field={field} />
    </label>
  ))

const OperationView = () => {
  const operation = useOperation()
  if (!operation) return null
  return (
    <Operation.Root key={operation.id}>
      <Operation.Method /> <Operation.Path />
      <h1>
        <Operation.Summary />
      </h1>
      <Operation.Description />
      {operation.requestBody?.content.map((media) => (
        <SchemaView key={media.mediaType} media={media} />
      ))}
      {operation.responses.map((response) => (
        <section key={response.status}>
          <h2>{response.status}</h2>
          {response.content.map((media) => (
            <SchemaView key={media.mediaType} media={media} />
          ))}
        </section>
      ))}
      {operation.kind === "operation" && (
        <TryIt.Root>
          <TryIt.ServerSelect />
          <TryIt.Server />
          {operation.parameters.map((parameter) => (
            <label key={`${parameter.in}.${parameter.name}`}>
              {parameter.name} <TryIt.Parameter parameter={parameter} />
            </label>
          ))}
          <BodyFields />
          <TryIt.Body />
          <TryIt.Send>Send</TryIt.Send>
          <TryIt.Curl asChild>
            <pre />
          </TryIt.Curl>
          <TryIt.Error />
          <TryIt.Status />
          <TryIt.ResponseBody asChild>
            <pre />
          </TryIt.ResponseBody>
        </TryIt.Root>
      )}
    </Operation.Root>
  )
}

mount(
  <SpectileProvider model={model} defaultActiveId={model.operations[0]?.id}>
    <a href="/">Themed playground</a>
    <Sidebar />
    <OperationView />
  </SpectileProvider>,
)
