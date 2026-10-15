import {
  type MediaType,
  type NormalizedOperation,
  type OpenAPIDocument,
  type SecurityScheme,
  type SpecModel,
  normalize,
} from "@spectile/core";
import { schemaTypeLabel } from "@spectile/headless";
import {
  Markdown,
  Operation,
  Schema,
  SpectileProvider,
  TryIt,
  useNavigation,
  useOperation,
  useOperationContext,
  useSchema,
  useSpectile,
  useTryItContext,
} from "@spectile/react";
import { type FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import example from "./example.json";

const renderMarkdown = (markdown: string) => <ReactMarkdown>{markdown}</ReactMarkdown>;

type Loaded = { model: SpecModel; specUrl?: string };

const loadModel = async (specUrl: string): Promise<Loaded> => {
  const { loadSpec } = await import("@spectile/core/loader");
  return { model: normalize((await loadSpec(specUrl)).document), specUrl };
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

const isBasic = (scheme: SecurityScheme) =>
  scheme.type === "http" && scheme.scheme.toLowerCase() === "basic";

const CredentialFields = ({ scheme }: { scheme: SecurityScheme }) => {
  if (scheme.type === "mutualTLS") return null;
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
    );
  }
  return (
    <label>
      {scheme.name} <span className="muted">{scheme.type === "apiKey" ? "API key" : "token"}</span>
      <TryIt.Credential scheme={scheme.name} type="password" autoComplete="off" />
    </label>
  );
};

const ServerFields = () => {
  const { servers } = useOperationContext();
  const { serverVariables } = useTryItContext();
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
  );
};

const TryItPanel =({ operation }: { operation: NormalizedOperation }) => {
  const { model } = useSpectile();
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
  );
};

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
                <Markdown source={parameter.description} className="description" />
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

      <TryItPanel operation={operation} />
    </Operation.Root>
  );
};

export const App = () => {
  const [loaded, setLoaded] = useState<Loaded>(() => ({
    model: normalize(example as OpenAPIDocument),
  }));
  const [error, setError] = useState<string>();
  const { model } = loaded;

  const load = (url: string) =>
    loadModel(url).then(
      (next) => {
        setLoaded(next);
        setError(undefined);
      },
      (reason: unknown) => setError(String(reason)),
    );

  return (
    <div className="app">
      <header className="topbar">
        <strong>{model.info.title}</strong>
        <SpecForm onLoad={(url) => void load(url)} />
        <a href="/unstyled.html">Unstyled</a>
      </header>
      {error && <p role="alert">{error}</p>}
      <SpectileProvider
        model={model}
        defaultActiveId={model.operations[0]?.id}
        tryIt={{ baseUrl: loaded.specUrl }}
        renderMarkdown={renderMarkdown}
      >
        <div className="layout">
          <Sidebar />
          <main>
            <OperationView />
          </main>
        </div>
      </SpectileProvider>
    </div>
  );
};
