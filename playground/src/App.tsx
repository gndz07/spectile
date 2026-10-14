import { type MediaType, type OpenAPIDocument, type SpecModel, normalize } from "@spectile/core";
import { schemaTypeLabel } from "@spectile/headless";
import {
  Operation,
  Schema,
  SpectileProvider,
  useNavigation,
  useOperation,
  useSchema,
} from "@spectile/react";
import { type FormEvent, useState } from "react";
import example from "./example.json";

const loadModel = async (url: string) => {
  const { loadSpec } = await import("@spectile/core/loader");
  return normalize((await loadSpec(url)).document);
};

const SpecForm = ({ onLoad }: { onLoad: (url: string) => void }) => {
  const [url, setUrl] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (url) onLoad(url);
  };
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
  );
};

const Sidebar = () => {
  const { groups, resultCount, getSearchProps, getItemProps } = useNavigation();
  return (
    <nav className="sidebar">
      <input {...getSearchProps()} placeholder="Search operations" aria-label="Search operations" />
      <p className="muted">{resultCount} operations</p>
      {groups.map(({ tag, operations }) => (
        <section key={tag?.name ?? ""}>
          <h2>{tag?.name ?? "Other"}</h2>
          <ul>
            {operations.map((operation) => (
              <li key={operation.id}>
                <button type="button" className="nav-item" {...getItemProps(operation)}>
                  <span className="method" data-method={operation.method}>
                    {operation.method}
                  </span>
                  {operation.summary ?? operation.path}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
};

const RootType = () => <code className="type">{schemaTypeLabel(useSchema().root)}</code>;

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
  ) : null;

const OperationView = () => {
  const operation = useOperation();
  if (!operation) return <p className="muted">Select an operation</p>;
  const { parameters, requestBody, responses } = operation;
  return (
    <Operation.Root key={operation.id} className="operation">
      <header>
        <Operation.Method className="method" /> <Operation.Path className="path" />
      </header>
      <h1>
        <Operation.Summary />
      </h1>
      <Operation.Description className="description" />

      {parameters.length > 0 && (
        <section>
          <h2>Parameters</h2>
          <ul className="parameters">
            {parameters.map((parameter) => (
              <li key={`${parameter.in}:${parameter.name}`}>
                <code>{parameter.name}</code> <span className="muted">{parameter.in}</span>
                {parameter.required && <span className="required">required</span>}
                {parameter.description && <p className="description">{parameter.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {requestBody && (
        <section>
          <h2>Request body</h2>
          {requestBody.content.map((media) => (
            <SchemaView key={media.mediaType} media={media} />
          ))}
        </section>
      )}

      <section>
        <h2>Responses</h2>
        {responses.map((response) => (
          <div key={response.status} className="response">
            <h3>
              {response.status} <span className="muted">{response.description}</span>
            </h3>
            {response.content.map((media) => (
              <SchemaView key={media.mediaType} media={media} />
            ))}
          </div>
        ))}
      </section>
    </Operation.Root>
  );
};

export const App = () => {
  const [model, setModel] = useState<SpecModel>(() => normalize(example as OpenAPIDocument));
  const [error, setError] = useState<string>();

  const load = (url: string) =>
    loadModel(url).then(
      (loaded) => {
        setModel(loaded);
        setError(undefined);
      },
      (reason: unknown) => setError(String(reason)),
    );

  return (
    <div className="app">
      <header className="topbar">
        <strong>{model?.info.title ?? "Spectile"}</strong>
        <SpecForm onLoad={(url) => void load(url)} />
      </header>
      {error && <p role="alert">{error}</p>}
      {model && (
        <SpectileProvider model={model} defaultActiveId={model.operations[0]?.id}>
          <div className="layout">
            <Sidebar />
            <main>
              <OperationView />
            </main>
          </div>
        </SpectileProvider>
      )}
    </div>
  );
};
