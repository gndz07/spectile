import { type Credential, type Parameter, parameterKey } from "@spectile/core";
import type { EventLike, InputEventLike } from "../events";
import type { OperationTryItSnapshot } from "./types";

export type OperationActions = {
  getSnapshot: () => OperationTryItSnapshot;
  send: () => Promise<void>;
  setParameter: (key: string, value: string) => void;
  setBody: (body: string) => void;
  selectServer: (index: number) => void;
  setServerVariable: (name: string, value: string) => void;
  setServerUrl: (url: string) => void;
};

const valueOf = (event: InputEventLike) => event.currentTarget.value;

export const operationProps = ({
  getSnapshot,
  send,
  setParameter,
  setBody,
  selectServer,
  setServerVariable,
  setServerUrl,
}: OperationActions) => {
  const isPending = () => getSnapshot().result.status === "pending";

  const getFormProps = () => ({
    "data-state": getSnapshot().result.status,
    onSubmit: (event: EventLike) => {
      event.preventDefault();
      void send();
    },
  });

  const getParameterProps = (parameter: Parameter) => {
    const key = parameterKey(parameter);
    return {
      name: key,
      value: getSnapshot().draft.parameters[key] ?? "",
      required: parameter.required,
      onChange: (event: InputEventLike) => setParameter(key, valueOf(event)),
    };
  };

  const getBodyProps = () => ({
    name: "body",
    value: getSnapshot().draft.body,
    onChange: (event: InputEventLike) => setBody(valueOf(event)),
  });

  const getSendProps = () => ({
    type: "submit" as const,
    disabled: isPending(),
    "aria-busy": isPending(),
  });

  /** Not `type: "url"`, so relative URLs like `/` don't block the form. */
  const getServerProps = () => ({
    name: "server",
    inputMode: "url" as const,
    value: getSnapshot().serverUrl,
    onChange: (event: InputEventLike) => setServerUrl(valueOf(event)),
  });

  /** Option values are indexes into the operation's `servers`. */
  const getServerSelectProps = () => ({
    name: "server",
    value: String(getSnapshot().serverIndex),
    onChange: (event: InputEventLike) => selectServer(Number(valueOf(event))),
  });

  const getServerVariableProps = (name: string) => ({
    name: `server.${name}`,
    value: getSnapshot().serverVariables[name] ?? "",
    onChange: (event: InputEventLike) => setServerVariable(name, valueOf(event)),
  });

  return {
    getFormProps,
    getParameterProps,
    getBodyProps,
    getSendProps,
    getServerProps,
    getServerSelectProps,
    getServerVariableProps,
  };
};

const pairOf = (credential: Credential | undefined) =>
  typeof credential === "object" ? credential : { username: "", password: "" };

/** Without `field`, the credential is a token or key. With it, one half of a username and password. */
export const credentialProps =
  (
    getCredentials: () => Record<string, Credential>,
    setCredential: (name: string, credential: Credential) => void,
  ) =>
  (name: string, field?: "username" | "password") => {
    const current = getCredentials()[name];
    return {
      name: field ? `${name}.${field}` : name,
      value: field ? pairOf(current)[field] : typeof current === "string" ? current : "",
      onChange: (event: InputEventLike) =>
        setCredential(
          name,
          field ? { ...pairOf(getCredentials()[name]), [field]: valueOf(event) } : valueOf(event),
        ),
    };
  };
