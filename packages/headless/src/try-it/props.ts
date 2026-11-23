import {
  type BodyField,
  type Credential,
  type FileLike,
  type Parameter,
  parameterKey,
} from "@spectile/core"
import type { EventLike, FileInputEventLike, InputEventLike } from "../events"
import { patched } from "../store"
import type { OperationTryItSnapshot } from "./types"

export type OperationActions = {
  getSnapshot: () => OperationTryItSnapshot
  send: () => Promise<void>
  setParameter: (key: string, value: string) => void
  setBody: (body: string) => void
  setField: (name: string, text: string) => void
  setFiles: (name: string, files: FileLike[]) => void
  setMediaType: (mediaType: string) => void
  selectServer: (index: number) => void
  setServerVariable: (name: string, value: string) => void
  setServerUrl: (url: string) => void
}

const valueOf = (event: InputEventLike) => event.currentTarget.value

export const operationProps = ({
  getSnapshot,
  send,
  setParameter,
  setBody,
  setField,
  setFiles,
  setMediaType,
  selectServer,
  setServerVariable,
  setServerUrl,
}: OperationActions) => {
  const isPending = () => getSnapshot().result.status === "pending"

  const getFormProps = () => ({
    "data-state": getSnapshot().result.status,
    onSubmit: (event: EventLike) => {
      event.preventDefault()
      void send()
    },
  })

  const getParameterProps = (parameter: Parameter) => {
    const key = parameterKey(parameter)
    return {
      name: key,
      value: getSnapshot().draft.parameters[key] ?? "",
      required: parameter.required,
      onChange: (event: InputEventLike) => setParameter(key, valueOf(event)),
    }
  }

  const getBodyProps = () => ({
    name: "body",
    value: getSnapshot().draft.body,
    onChange: (event: InputEventLike) => setBody(valueOf(event)),
  })

  /** File inputs can't be given a value, so their props have none. */
  const getFieldProps = ({ name, required, file, multiple, accept }: BodyField) =>
    file
      ? {
          name: `body.${name}`,
          type: "file" as const,
          multiple,
          accept,
          required,
          onChange: (event: FileInputEventLike) =>
            setFiles(name, Array.from(event.currentTarget.files ?? [])),
        }
      : {
          name: `body.${name}`,
          value: getSnapshot().draft.fields[name] ?? "",
          required,
          onChange: (event: InputEventLike) => setField(name, valueOf(event)),
        }

  /** Option values are the request body's media types. */
  const getMediaTypeSelectProps = () => ({
    name: "mediaType",
    value: getSnapshot().draft.mediaType ?? "",
    onChange: (event: InputEventLike) => setMediaType(valueOf(event)),
  })

  const getSendProps = () => ({
    type: "submit" as const,
    disabled: isPending(),
    "aria-busy": isPending(),
  })

  /** Not `type: "url"`, so relative URLs like `/` don't block the form. */
  const getServerProps = () => {
    const { typedServerUrl, serverUrl } = getSnapshot()
    return {
      name: "server",
      inputMode: "url" as const,
      value: typedServerUrl ?? serverUrl,
      onChange: (event: InputEventLike) => setServerUrl(valueOf(event)),
    }
  }

  /** Option values are indexes into the operation's `servers`. */
  const getServerSelectProps = () => ({
    name: "server",
    value: String(getSnapshot().serverIndex),
    onChange: (event: InputEventLike) => selectServer(Number(valueOf(event))),
  })

  const getServerVariableProps = (name: string) => ({
    name: `server.${name}`,
    value: getSnapshot().serverVariables[name] ?? "",
    onChange: (event: InputEventLike) => setServerVariable(name, valueOf(event)),
  })

  return {
    getFormProps,
    getParameterProps,
    getBodyProps,
    getFieldProps,
    getMediaTypeSelectProps,
    getSendProps,
    getServerProps,
    getServerSelectProps,
    getServerVariableProps,
  }
}

const pairOf = (credential: Credential | undefined) =>
  typeof credential === "object" ? credential : { username: "", password: "" }

/** Without `field`, the credential is a token or key. With it, one half of a username and password. */
export const credentialProps =
  (
    getCredentials: () => Record<string, Credential>,
    setCredential: (name: string, credential: Credential) => void,
  ) =>
  (name: string, field?: "username" | "password") => {
    const current = getCredentials()[name]
    return {
      name: field ? `${name}.${field}` : name,
      value: field ? pairOf(current)[field] : typeof current === "string" ? current : "",
      onChange: (event: InputEventLike) =>
        setCredential(
          name,
          field ? patched(pairOf(getCredentials()[name]), { [field]: valueOf(event) }) : valueOf(event),
        ),
    }
  }
