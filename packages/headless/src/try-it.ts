import {
  type Credential,
  type HttpRequest,
  type MediaType,
  type NormalizedOperation,
  type Parameter,
  type SpecModel,
  buildRequest,
  exampleFromSchema,
  getSchema,
  missingParameters,
  parameterKey,
  resolveServerUrl,
} from "@spectile/core";
import type { EventLike, InputEventLike } from "./events";
import { createStore, memoizeLast } from "./store";

export type HttpResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  /** Milliseconds from sending to the full body. */
  duration: number;
};

export type TryItResult =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done"; response: HttpResponse }
  | { status: "error"; error: string };

/** What the user typed for one operation. Parameter values are text, keyed by `parameterKey`. */
export type RequestDraft = { parameters: Record<string, string>; body: string; mediaType?: string };

export type ResponseLike = {
  status: number;
  statusText: string;
  headers: { forEach: (callback: (value: string, key: string) => void) => void };
  text: () => Promise<string>;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: unknown },
) => Promise<ResponseLike>;

export type TryItOptions = {
  /** Defaults to the global `fetch`. Pass your own to add a proxy, logging or test doubles. */
  fetch?: FetchLike;
  /** Defaults to the first server in the spec. */
  serverUrl?: string;
};

export type TryItSettings = { serverUrl: string; credentials: Record<string, Credential> };

export type OperationTryItSnapshot = {
  draft: RequestDraft;
  result: TryItResult;
  request: HttpRequest;
  missing: Parameter[];
};

type TryItState = TryItSettings & {
  drafts: Record<string, RequestDraft>;
  results: Record<string, TryItResult>;
};

type Controller = { signal?: unknown; abort: () => void };

const IDLE: TryItResult = { status: "idle" };
const PENDING: TryItResult = { status: "pending" };

const isJson = (mediaType = "") => /[/+]json\b/i.test(mediaType);

const inputText = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(",");
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

const without = <T>(record: Record<string, T>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([candidate]) => candidate !== key));

export const parameterExample = (model: SpecModel, parameter: Parameter) => {
  const node = parameter.schema && getSchema(model, parameter.schema.pointer);
  return inputText(
    parameter.examples[0]?.value ?? node?.examples[0] ?? node?.default ?? node?.enum?.[0],
  );
};

export const bodyExample = (model: SpecModel, { mediaType, schema, examples }: MediaType) => {
  const value = examples[0]?.value ?? (schema && exampleFromSchema(model, schema));
  if (value === undefined) return "";
  return isJson(mediaType) || typeof value !== "string" ? JSON.stringify(value, null, 2) : value;
};

export const initialDraft = (model: SpecModel, operation: NormalizedOperation): RequestDraft => {
  const media = operation.requestBody?.content[0];
  return {
    parameters: Object.fromEntries(
      operation.parameters.map((parameter) => [
        parameterKey(parameter),
        parameterExample(model, parameter),
      ]),
    ),
    body: media ? bodyExample(model, media) : "",
    mediaType: media?.mediaType,
  };
};

/** Turns typed text into the value the parameter's schema expects: comma-separated arrays, JSON objects. */
export const parseParameterInput = (model: SpecModel, parameter: Parameter, text: string): unknown => {
  const types = parameter.schema ? getSchema(model, parameter.schema.pointer).types : [];
  if (types.includes("array")) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (types.includes("object")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
};

export const formatResponseBody = (body: string, contentType?: string) => {
  if (!isJson(contentType)) return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

const errorMessage = (error: unknown) => {
  if (error instanceof TypeError) {
    return `${error.message}. The server may be unreachable, or may not allow requests from this page (CORS).`;
  }
  return error instanceof Error ? error.message : String(error);
};

const toResponse = (response: ResponseLike, body: string, duration: number): HttpResponse => {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const { status, statusText } = response;
  return { status, statusText, headers, body: formatResponseBody(body, headers["content-type"]), duration };
};

const createController = (): Controller => {
  const AbortControllerClass = (globalThis as { AbortController?: new () => Controller })
    .AbortController;
  return AbortControllerClass ? new AbortControllerClass() : { abort: () => {} };
};

const globalFetch = () => (globalThis as { fetch?: FetchLike }).fetch;

export const createTryIt = (model: SpecModel, options: TryItOptions = {}) => {
  const [firstServer] = model.servers;
  const store = createStore<TryItState>({
    serverUrl: options.serverUrl ?? (firstServer ? resolveServerUrl(firstServer) : ""),
    credentials: {},
    drafts: {},
    results: {},
  });
  const controllers = new Map<string, Controller>();
  const initialDrafts = new Map<string, RequestDraft>();

  const draftFor = (state: TryItState, operation: NormalizedOperation) => {
    const draft = state.drafts[operation.id];
    if (draft) return draft;
    const initial = initialDrafts.get(operation.id) ?? initialDraft(model, operation);
    initialDrafts.set(operation.id, initial);
    return initial;
  };

  const setServerUrl = (serverUrl: string) => store.setState({ serverUrl });

  const setCredential = (name: string, credential: Credential | undefined) =>
    store.setState((state) => ({
      ...state,
      credentials:
        credential === undefined
          ? without(state.credentials, name)
          : { ...state.credentials, [name]: credential },
    }));

  const settingsFor = memoizeLast(
    (serverUrl: string, credentials: Record<string, Credential>): TryItSettings => ({
      serverUrl,
      credentials,
    }),
  );

  const getSnapshot = () => {
    const { serverUrl, credentials } = store.getSnapshot();
    return settingsFor(serverUrl, credentials);
  };

  const getServerProps = () => ({
    type: "url" as const,
    value: store.getSnapshot().serverUrl,
    onChange: (event: InputEventLike) => setServerUrl(event.currentTarget.value),
  });

  /** Without `field`, the credential is a token or key. With it, one half of a username and password. */
  const getCredentialProps = (name: string, field?: "username" | "password") => {
    const pairOf = (credential: Credential | undefined) =>
      typeof credential === "object" ? credential : { username: "", password: "" };
    const current = store.getSnapshot().credentials[name];
    return {
      name: field ? `${name}.${field}` : name,
      value: field ? pairOf(current)[field] : typeof current === "string" ? current : "",
      onChange: ({ currentTarget: { value } }: InputEventLike) =>
        setCredential(
          name,
          field ? { ...pairOf(store.getSnapshot().credentials[name]), [field]: value } : value,
        ),
    };
  };

  const createSession = (operation: NormalizedOperation) => {
    const { id } = operation;

    const parse = (parameters: Record<string, string>) =>
      Object.fromEntries(
        operation.parameters.map((parameter) => {
          const key = parameterKey(parameter);
          return [key, parseParameterInput(model, parameter, parameters[key] ?? "")];
        }),
      );

    const snapshotFor = memoizeLast(
      (
        draft: RequestDraft,
        result: TryItResult,
        serverUrl: string,
        credentials: Record<string, Credential>,
      ): OperationTryItSnapshot => {
        const parameters = parse(draft.parameters);
        return {
          draft,
          result,
          request: buildRequest(model, operation, {
            serverUrl,
            credentials,
            parameters,
            body: draft.body,
            mediaType: draft.mediaType,
          }),
          missing: missingParameters(operation, parameters),
        };
      },
    );

    const getSnapshot = () => {
      const state = store.getSnapshot();
      return snapshotFor(
        draftFor(state, operation),
        state.results[id] ?? IDLE,
        state.serverUrl,
        state.credentials,
      );
    };

    const updateDraft = (change: (draft: RequestDraft) => RequestDraft) =>
      store.setState((state) => ({
        ...state,
        drafts: { ...state.drafts, [id]: change(draftFor(state, operation)) },
      }));

    const setResult = (result: TryItResult) =>
      store.setState((state) => ({ ...state, results: { ...state.results, [id]: result } }));

    const setParameter = (key: string, value: string) =>
      updateDraft((draft) => ({ ...draft, parameters: { ...draft.parameters, [key]: value } }));

    const setBody = (body: string) => updateDraft((draft) => ({ ...draft, body }));

    /** Switches the request content type and refills the body with its example. */
    const setMediaType = (mediaType: string) => {
      const media = operation.requestBody?.content.find(
        (candidate) => candidate.mediaType === mediaType,
      );
      updateDraft((draft) => ({
        ...draft,
        mediaType,
        body: media ? bodyExample(model, media) : draft.body,
      }));
    };

    const cancel = () => {
      const controller = controllers.get(id);
      if (!controller) return;
      controllers.delete(id);
      controller.abort();
      setResult(IDLE);
    };

    const send = async () => {
      const { request, missing } = getSnapshot();
      if (missing.length > 0) {
        const names = missing.map((parameter) => parameter.name).join(", ");
        return setResult({ status: "error", error: `Missing required parameters: ${names}` });
      }
      const fetchRequest = options.fetch ?? globalFetch();
      if (!fetchRequest) return setResult({ status: "error", error: "fetch is not available" });

      controllers.get(id)?.abort();
      const controller = createController();
      controllers.set(id, controller);
      const isCurrent = () => controllers.get(id) === controller;
      setResult(PENDING);
      const started = Date.now();
      try {
        const { url, ...init } = request;
        const response = await fetchRequest(url, { ...init, signal: controller.signal });
        const body = await response.text();
        if (isCurrent()) {
          setResult({ status: "done", response: toResponse(response, body, Date.now() - started) });
        }
      } catch (error) {
        if (isCurrent()) setResult({ status: "error", error: errorMessage(error) });
      } finally {
        if (isCurrent()) controllers.delete(id);
      }
    };

    const reset = () => {
      cancel();
      initialDrafts.delete(id);
      store.setState((state) => ({
        ...state,
        drafts: without(state.drafts, id),
        results: without(state.results, id),
      }));
    };

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
        onChange: (event: InputEventLike) => setParameter(key, event.currentTarget.value),
      };
    };

    const getBodyProps = () => ({
      name: "body",
      value: getSnapshot().draft.body,
      onChange: (event: InputEventLike) => setBody(event.currentTarget.value),
    });

    const getSendProps = () => ({
      type: "submit" as const,
      disabled: isPending(),
      "aria-busy": isPending(),
    });

    return {
      getSnapshot,
      subscribe: store.subscribe,
      setParameter,
      setBody,
      setMediaType,
      send,
      cancel,
      reset,
      getFormProps,
      getParameterProps,
      getBodyProps,
      getSendProps,
    };
  };

  const sessions = new Map<string, ReturnType<typeof createSession>>();

  const forOperation = (id: string) => {
    const existing = sessions.get(id);
    if (existing) return existing;
    const operation = model.operations.find((candidate) => candidate.id === id);
    if (!operation) throw new Error(`Unknown operation ${id}`);
    const session = createSession(operation);
    sessions.set(id, session);
    return session;
  };

  return {
    getSnapshot,
    subscribe: store.subscribe,
    setServerUrl,
    setCredential,
    getServerProps,
    getCredentialProps,
    forOperation,
  };
};

export type TryIt = ReturnType<typeof createTryIt>;

export type OperationTryIt = ReturnType<TryIt["forOperation"]>;
