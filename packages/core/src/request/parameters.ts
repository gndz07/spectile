import type { Parameter } from "../model";

type Shape =
  | { kind: "primitive"; value: string }
  | { kind: "array"; items: string[] }
  | { kind: "object"; entries: [string, string][] };

type Operator = { prefix: string; separator: string; named: boolean };

const SIMPLE: Operator = { prefix: "", separator: ",", named: false };

const OPERATORS: Record<string, Operator> = {
  simple: SIMPLE,
  label: { prefix: ".", separator: ".", named: false },
  matrix: { prefix: ";", separator: ";", named: true },
};

const DELIMITERS: Record<string, string> = { form: ",", spaceDelimited: "%20", pipeDelimited: "|" };

export const parameterKey = ({ in: location, name }: Pick<Parameter, "in" | "name">) =>
  `${location}.${name}`;

export const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const text = (value: unknown) =>
  typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);

const shape = (value: unknown): Shape => {
  if (Array.isArray(value)) return { kind: "array", items: value.map(text) };
  if (typeof value === "object" && value !== null) {
    return { kind: "object", entries: Object.entries(value).map(([key, item]) => [key, text(item)]) };
  }
  return { kind: "primitive", value: text(value) };
};

const encode = encodeURIComponent;

const identity = (value: string) => value;

/** RFC 6570 expansion, used by path and header parameters. */
const expand = (
  name: string,
  value: Shape,
  explode: boolean,
  { prefix, separator, named }: Operator,
  escape: (value: string) => string,
) => {
  const assign = (content: string) => (named ? `${name}=${content}` : content);
  switch (value.kind) {
    case "primitive":
      return prefix + assign(escape(value.value));
    case "array":
      return (
        prefix +
        (explode
          ? value.items.map((item) => assign(escape(item))).join(separator)
          : assign(value.items.map(escape).join(",")))
      );
    case "object":
      return (
        prefix +
        (explode
          ? value.entries.map(([key, item]) => `${escape(key)}=${escape(item)}`).join(separator)
          : assign(value.entries.flat().map(escape).join(",")))
      );
  }
};

export const serializePathParameter = (
  { name, style = "simple", explode = false }: Parameter,
  value: unknown,
) => expand(name, shape(value), explode, OPERATORS[style] ?? SIMPLE, encode);

export const serializeHeaderParameter = ({ name, explode = false }: Parameter, value: unknown) =>
  expand(name, shape(value), explode, SIMPLE, identity);

/** Query and cookie parameters, as encoded `name=value` pairs. */
export const serializeFormParameter = (
  { name, style = "form", explode = style === "form" }: Parameter,
  value: unknown,
): string[] => {
  const data = shape(value);
  const pair = (key: string, content: string) => `${encode(key)}=${content}`;
  if (style === "deepObject" && data.kind === "object") {
    return data.entries.map(([key, item]) => `${encode(name)}[${encode(key)}]=${encode(item)}`);
  }
  if (data.kind === "primitive") return [pair(name, encode(data.value))];
  if (explode) {
    return data.kind === "array"
      ? data.items.map((item) => pair(name, encode(item)))
      : data.entries.map(([key, item]) => pair(key, encode(item)));
  }
  const parts = data.kind === "array" ? data.items : data.entries.flat();
  return [pair(name, parts.map(encode).join(DELIMITERS[style] ?? ","))];
};
