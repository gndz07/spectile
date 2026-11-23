import { type SecurityScheme, bodyExample, parameterKey, toCurl } from "@spectile/core"
import { Copy, TryIt, useOperationContext, useSpectile, useTryItContext } from "@spectile/react"
import { type ReactNode, useId, useMemo, useState } from "react"
import { CodeBlock, mediaTypeLabel, statusTone } from "./bits"
import { LockIcon } from "./icons"
import { Disclosure } from "./presence"
import { Tabs } from "./tabs"

const Field = ({
  label,
  missing,
  wide,
  children,
}: {
  label: ReactNode
  missing?: boolean
  wide?: boolean
  children: ReactNode
}) => (
  <label
    className="spectile-field"
    data-missing={missing ? "" : undefined}
    data-wide={wide ? "" : undefined}
  >
    <span className="spectile-field-label">{label}</span>
    {children}
  </label>
)

const isBasic = (scheme: SecurityScheme) =>
  scheme.type === "http" && scheme.scheme.toLowerCase() === "basic"

const credentialLabel = (scheme: SecurityScheme) => {
  if (scheme.type === "apiKey") return scheme.paramName
  if (scheme.type === "http" && scheme.scheme.toLowerCase() === "bearer") return "Bearer token"
  return `${scheme.name} token`
}

const Locked = ({ children }: { children: ReactNode }) => (
  <>
    <LockIcon /> {children}
  </>
)

const CredentialField = ({ scheme }: { scheme: SecurityScheme }) => (
  <div className="spectile-credential" data-wide={isBasic(scheme) ? "" : undefined}>
    {isBasic(scheme) ? (
      <div className="spectile-field-pair">
        <Field label={<Locked>Username</Locked>}>
          <TryIt.Credential
            scheme={scheme.name}
            field="username"
            className="spectile-input"
            autoComplete="off"
          />
        </Field>
        <Field label="Password">
          <TryIt.Credential
            scheme={scheme.name}
            field="password"
            type="password"
            className="spectile-input"
          />
        </Field>
      </div>
    ) : (
      <Field label={<Locked>{credentialLabel(scheme)}</Locked>}>
        <TryIt.Credential
          scheme={scheme.name}
          type="password"
          autoComplete="off"
          className="spectile-input"
        />
      </Field>
    )}
    <TryIt.CredentialDescription scheme={scheme.name} className="spectile-hint spectile-prose" />
  </div>
)

/** The schemes the operation can use, mutual TLS left out since the browser handles it. */
const useCredentialSchemes = () => {
  const { model } = useSpectile()
  const names = new Set(
    useOperationContext().security.flatMap(({ schemes }) => schemes.map(({ name }) => name)),
  )
  return model.securitySchemes.filter(
    (scheme) => names.has(scheme.name) && scheme.type !== "mutualTLS",
  )
}

const CUSTOM_SERVER = "custom"

/** One server: its URL, editable. Several: a select of them plus "Custom…", which shows the URL field. */
const ServerFields = () => {
  const { servers } = useOperationContext()
  const { serverVariables, serverIndex, serverUrl, typedServerUrl, setServerUrl } =
    useTryItContext()
  const custom = typedServerUrl !== undefined
  const several = servers.length > 1
  return (
    <>
      {several && (
        <Field label="Server" wide>
          <TryIt.ServerSelect
            className="spectile-select"
            value={custom ? CUSTOM_SERVER : String(serverIndex)}
            onChange={(event) => {
              if (event.currentTarget.value !== CUSTOM_SERVER) return
              event.preventDefault()
              setServerUrl(serverUrl)
            }}
          >
            {servers.map((server, index) => (
              <option key={index} value={index}>
                {server.description ?? server.url}
              </option>
            ))}
            <option value={CUSTOM_SERVER}>Custom…</option>
          </TryIt.ServerSelect>
        </Field>
      )}
      {!custom &&
        Object.keys(serverVariables).map((name) => (
          <Field key={name} label={name}>
            <TryIt.ServerVariable name={name} className="spectile-input" />
          </Field>
        ))}
      {(!several || custom) && (
        <Field label="Server URL" wide>
          <TryIt.Server className="spectile-input" spellCheck={false} />
        </Field>
      )}
    </>
  )
}

const ParameterFields = () => {
  const { parameters } = useOperationContext()
  const { missing } = useTryItContext()
  const missingKeys = new Set(missing.map(parameterKey))
  return parameters.map((parameter) => {
    const key = parameterKey(parameter)
    return (
      <Field
        key={key}
        label={`${parameter.name}${parameter.required ? " *" : ""}`}
        missing={missingKeys.has(key)}
      >
        <TryIt.Parameter
          parameter={parameter}
          className="spectile-input"
          placeholder={parameter.required ? "required" : undefined}
          spellCheck={false}
        />
      </Field>
    )
  })
}

/** "Body · JSON" with a quiet Reset beside it, which puts the example back. */
const BodyEditor = () => {
  const { model } = useSpectile()
  const { requestBody } = useOperationContext()
  const { draft, setBody, missingBody } = useTryItContext()
  const id = useId()
  const media =
    requestBody?.content.find(({ mediaType }) => mediaType === draft.mediaType) ??
    requestBody?.content[0]
  const example = useMemo(() => (media ? bodyExample(model, media) : ""), [model, media])
  return (
    <div className="spectile-field" data-missing={missingBody ? "" : undefined} data-wide="">
      <div className="spectile-field-header">
        <label htmlFor={id} className="spectile-field-label">
          Body{media && ` · ${mediaTypeLabel(media.mediaType)}`}
        </label>
        <button
          type="button"
          className="spectile-quiet-button"
          disabled={draft.body === example}
          onClick={() => setBody(example)}
        >
          Reset
        </button>
      </div>
      <TryIt.Body id={id} className="spectile-input spectile-body-input" rows={8} spellCheck={false} />
    </div>
  )
}

const BodyFields = () => {
  const { requestBody } = useOperationContext()
  const { bodyFields, missingFields } = useTryItContext()
  const missingNames = new Set(missingFields.map(({ name }) => name))
  return (
    <>
      {bodyFields.map((field) => (
        <Field
          key={field.name}
          label={`${field.name}${field.required ? " *" : ""}`}
          missing={missingNames.has(field.name)}
        >
          <TryIt.Field field={field} className="spectile-input" />
        </Field>
      ))}
      {bodyFields.length === 0 && requestBody && <BodyEditor />}
    </>
  )
}

/** "user_id" or "user_id, limit and the body". */
const listNames = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`

const useMissingNames = () => {
  const { missing, missingFields, missingBody } = useTryItContext()
  return [
    ...missing.map(({ name }) => name),
    ...missingFields.map(({ name }) => name),
    ...(missingBody && missingFields.length === 0 ? ["the body"] : []),
  ]
}

/** Disabled while a required value is missing or a request is pending. */
export const SendButton = ({ children }: { children: ReactNode }) => {
  const { result } = useTryItContext()
  const missing = useMissingNames()
  return (
    <TryIt.Send
      className="spectile-button"
      data-variant="primary"
      disabled={missing.length > 0 || result.status === "pending"}
    >
      {children}
    </TryIt.Send>
  )
}

/** What's missing, then Send, Cancel and Copy curl. */
export const TryItActions = () => {
  const { request } = useTryItContext()
  const missing = useMissingNames()
  return (
    <>
      {missing.length > 0 && (
        <p className="spectile-missing">
          Fill in {listNames(missing)} to send.
        </p>
      )}
      <div className="spectile-actions">
        <SendButton>Send request</SendButton>
        <TryIt.Cancel className="spectile-button">Cancel</TryIt.Cancel>
        <Copy text={toCurl(request)} className="spectile-button">
          Copy curl
        </Copy>
      </div>
    </>
  )
}

/** The live curl, unfilled values marked. */
export const CurlPreview = () => (
  <pre className="spectile-code spectile-curl" aria-label="curl">
    <TryIt.Curl />
  </pre>
)

/** The form already shows the same values, so the curl waits behind a toggle (Copy curl covers copying). */
const CurlToggle = () => (
  <Disclosure label={(open) => (open ? "Hide curl" : "Show curl")}>
    <CurlPreview />
  </Disclosure>
)

const NetworkError = () => {
  const { result } = useTryItContext()
  if (result.status !== "error") return null
  return (
    <div
      className="spectile-banner"
      data-tone={result.network ? "server-error" : "warning"}
      role="alert"
    >
      {result.network && <p className="spectile-banner-title">The request didn't reach the API</p>}
      <p>{result.error}</p>
    </div>
  )
}

const ResponseResult = () => {
  const { result } = useTryItContext()
  const [tab, setTab] = useState<"body" | "headers">("body")
  if (result.status !== "done") return null
  const { response } = result
  const headers = Object.entries(response.headers)
  return (
    <div className="spectile-result">
      <div className="spectile-result-meta">
        <TryIt.Status className="spectile-chip" data-tone={statusTone(response.status)} />
        <TryIt.Duration className="spectile-muted" />
        <span aria-hidden className="spectile-muted">
          ·
        </span>
        <TryIt.Size className="spectile-muted" />
      </div>
      <Tabs
        label="Response"
        selected={tab}
        onSelect={setTab}
        tabs={[
          { value: "body", label: "Body" },
          { value: "headers", label: `Headers ${headers.length}` },
        ]}
      >
        {tab === "body" ? (
          response.body ? (
            <CodeBlock text={response.body} label="response body" />
          ) : (
            <p className="spectile-muted">
              {response.blob ? `Binary body (${response.blob.type || "unknown type"})` : "No content"}
            </p>
          )
        ) : (
          <dl className="spectile-headers">
            {headers.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Tabs>
    </div>
  )
}

const RequestFields = () => (
  <div className="spectile-fields">
    <ServerFields />
    {useCredentialSchemes().map((scheme) => (
      <CredentialField key={scheme.name} scheme={scheme} />
    ))}
    <ParameterFields />
    <BodyFields />
  </div>
)

/** The fields, then `actions`, then the live curl. */
export const TryItRequest = ({ actions }: { actions?: ReactNode }) => (
  <div className="spectile-try-it-request">
    <RequestFields />
    {actions}
    <CurlToggle />
  </div>
)

const WAITING = { idle: "Send the request to see the response here.", pending: "Sending…" }

/** Says where the response will appear until there is one. */
export const TryItResponse = () => {
  const { status } = useTryItContext().result
  return (
    <div className="spectile-try-it-response">
      {(status === "idle" || status === "pending") && (
        <p className="spectile-muted">{WAITING[status]}</p>
      )}
      <NetworkError />
      <ResponseResult />
    </div>
  )
}

/** Request fields, Send, curl and the response, inside a `TryIt.Root`. */
export const TryItFields = () => (
  <>
    <TryItRequest actions={<TryItActions />} />
    <TryItResponse />
  </>
)

/** The form and its curl, then the response; side by side when the inline form is wide. */
export const TryItColumns = () => (
  <>
    <div className="spectile-try-it-request">
      <RequestFields />
      <TryItActions />
      <CurlToggle />
    </div>
    <div className="spectile-try-it-output">
      <TryItResponse />
    </div>
  </>
)
