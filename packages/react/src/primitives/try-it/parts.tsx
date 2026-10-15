import { type Parameter as ParameterModel, toCurl } from "@spectile/core"
import { useTryIt, useTryItSettings } from "../../hooks"
import { Primitive, type PrimitiveProps, Text, type TextProps, mergeProps } from "../../primitive"
import { useOperationContext } from "../operation/context"
import { TryItProvider, useTryItContext } from "./context"

export type RootProps = PrimitiveProps<"form">

/** A form for the surrounding `Operation.Root`. Submitting it sends the request. */
export const Root = (props: RootProps) => {
  const tryIt = useTryIt(useOperationContext().id)
  return (
    <TryItProvider value={tryIt}>
      <Primitive as="form" {...mergeProps(tryIt.getFormProps(), props)} />
    </TryItProvider>
  )
}

export type ParameterProps = PrimitiveProps<"input"> & { parameter: ParameterModel }

export const Parameter = ({ parameter, ...props }: ParameterProps) => (
  <Primitive as="input" {...mergeProps(useTryItContext().getParameterProps(parameter), props)} />
)

export type BodyProps = PrimitiveProps<"textarea">

/** Renders nothing when the operation takes no request body. */
export const Body = (props: BodyProps) => {
  const { requestBody } = useOperationContext()
  const tryIt = useTryItContext()
  if (!requestBody) return null
  return <Primitive as="textarea" {...mergeProps(tryIt.getBodyProps(), props)} />
}

export type SendProps = PrimitiveProps<"button">

export const Send = (props: SendProps) => (
  <Primitive as="button" {...mergeProps(useTryItContext().getSendProps(), props)} />
)

const useResponse = () => {
  const { result } = useTryItContext()
  return result.status === "done" ? result.response : undefined
}

export const Status = (props: TextProps) => {
  const response = useResponse()
  return (
    <Text
      value={response && `${response.status} ${response.statusText}`.trim()}
      data-status={response?.status}
      data-ok={response && response.status >= 200 && response.status < 300 ? "" : undefined}
      {...props}
    />
  )
}

export const ResponseBody = (props: TextProps) => <Text value={useResponse()?.body} {...props} />

export const Error = (props: TextProps) => {
  const { result } = useTryItContext()
  return (
    <Text value={result.status === "error" ? result.error : undefined} role="alert" {...props} />
  )
}

export const Curl = (props: TextProps) => (
  <Text value={toCurl(useTryItContext().request)} {...props} />
)

export type ServerProps = PrimitiveProps<"input">

/** The base URL of the request. Typing here wins over `ServerSelect` and `ServerVariable`. */
export const Server = (props: ServerProps) => (
  <Primitive as="input" {...mergeProps(useTryItContext().getServerProps(), props)} />
)

export type ServerSelectProps = PrimitiveProps<"select">

/** Renders nothing when the operation has a single server. Defaults to one option per server. */
export const ServerSelect = ({ children, ...props }: ServerSelectProps) => {
  const { servers } = useOperationContext()
  const tryIt = useTryItContext()
  if (servers.length < 2) return null
  return (
    <Primitive as="select" {...mergeProps(tryIt.getServerSelectProps(), props)}>
      {children ??
        servers.map((server, index) => (
          <option key={index} value={index}>
            {server.description ?? server.url}
          </option>
        ))}
    </Primitive>
  )
}

export type ServerVariableProps = Omit<PrimitiveProps<"input">, "name"> & { name: string }

/**
 * A `<select>` when the variable lists its values, otherwise an `<input>`.
 * Renders nothing when the chosen server has no such variable.
 */
export const ServerVariable = ({ name, ...props }: ServerVariableProps) => {
  const { servers } = useOperationContext()
  const tryIt = useTryItContext()
  const variable = servers[tryIt.serverIndex]?.variables[name]
  if (!variable) return null
  const merged = mergeProps(tryIt.getServerVariableProps(name), props)
  if (!variable.enum) return <Primitive as="input" {...merged} />
  return (
    <Primitive as="select" {...(merged as PrimitiveProps<"select">)}>
      {props.children ??
        variable.enum.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
    </Primitive>
  )
}

export type CredentialProps = PrimitiveProps<"input"> & {
  /** The security scheme's name. */
  scheme: string
  /** For HTTP Basic: which half of the credential this input edits. */
  field?: "username" | "password"
}

/** A token, API key, username or password. Works anywhere inside `SpectileProvider`. */
export const Credential = ({ scheme, field, ...props }: CredentialProps) => (
  <Primitive
    as="input"
    {...mergeProps(useTryItSettings().getCredentialProps(scheme, field), props)}
  />
)
