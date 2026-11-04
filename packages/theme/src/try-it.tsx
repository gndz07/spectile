import { type SecurityScheme, parameterKey, toCurl } from "@spectile/core"
import { Copy, TryIt, useOperationContext, useSpectile, useTryItContext } from "@spectile/react"
import { type ReactNode, useState } from "react"
import { CodeBlock, CodeFrame, statusTone } from "./bits"
import { LockIcon } from "./icons"
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

const ServerFields = () => {
  const { servers } = useOperationContext()
  const { serverVariables } = useTryItContext()
  return (
    <>
      {servers.length > 1 && (
        <Field label="Server" wide>
          <TryIt.ServerSelect className="spectile-select" />
        </Field>
      )}
      {Object.keys(serverVariables).map((name) => (
        <Field key={name} label={name}>
          <TryIt.ServerVariable name={name} className="spectile-input" />
        </Field>
      ))}
      <Field label="Server URL" wide>
        <TryIt.Server className="spectile-input" spellCheck={false} />
      </Field>
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

const BodyFields = () => {
  const { requestBody } = useOperationContext()
  const { bodyFields, missingFields, missingBody } = useTryItContext()
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
      {bodyFields.length === 0 && requestBody && (
        <Field label="Body" missing={missingBody} wide>
          <TryIt.Body className="spectile-input spectile-body-input" rows={8} spellCheck={false} />
        </Field>
      )}
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

const Curl = () => (
  <pre className="spectile-code spectile-curl" aria-label="curl">
    <TryIt.Curl />
  </pre>
)

/** The live curl; with `copy`, its own copy button in the corner (the form has a Copy curl button). */
export const CurlPreview = ({ copy = false }: { copy?: boolean }) => {
  const { request } = useTryItContext()
  if (!copy) return <Curl />
  return (
    <CodeFrame copy={toCurl(request)} copyLabel="Copy curl">
      <Curl />
    </CodeFrame>
  )
}

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

/** The fields, then `actions`, then the live curl and Reset. */
export const TryItRequest = ({ actions }: { actions?: ReactNode }) => {
  const schemes = useCredentialSchemes()
  const { reset } = useTryItContext()
  return (
    <div className="spectile-try-it-request">
      <div className="spectile-fields">
        <ServerFields />
        {schemes.map((scheme) => (
          <CredentialField key={scheme.name} scheme={scheme} />
        ))}
        <ParameterFields />
        <BodyFields />
      </div>
      {actions}
      <CurlPreview />
      <button type="button" className="spectile-text-button" onClick={reset}>
        Reset to examples
      </button>
    </div>
  )
}

export const TryItResponse = () => (
  <div className="spectile-try-it-response">
    <NetworkError />
    <ResponseResult />
  </div>
)

/** Request fields, Send, curl and the response, inside a `TryIt.Root`. */
export const TryItFields = () => (
  <>
    <TryItRequest actions={<TryItActions />} />
    <TryItResponse />
  </>
)
