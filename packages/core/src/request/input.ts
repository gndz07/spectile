import type { MediaType, Parameter, SpecModel } from "../model";
import { exampleFromSchema } from "../schema/example";
import { getSchema } from "../schema/get";
import { isJsonMediaType } from "./media-type";
import { toText } from "./parameters";

const inputText = (value: unknown) => {
  if (value === undefined || value === null) return "";
  return Array.isArray(value) ? value.map(toText).join(",") : toText(value);
};

/** The parameter's example, default or first enum value, as text for an input. */
export const parameterExample = (model: SpecModel, parameter: Parameter) => {
  const node = parameter.schema && getSchema(model, parameter.schema);
  return inputText(
    parameter.examples[0]?.value ?? node?.examples[0] ?? node?.default ?? node?.enum?.[0],
  );
};

export const bodyExample = (model: SpecModel, { mediaType, schema, examples }: MediaType) => {
  const value = examples[0]?.value ?? (schema && exampleFromSchema(model, schema));
  if (value === undefined) return "";
  return isJsonMediaType(mediaType) || typeof value !== "string"
    ? JSON.stringify(value, null, 2)
    : value;
};

/** Turns typed text into the value the parameter's schema expects: comma-separated arrays, JSON objects. */
export const parseParameterInput = (model: SpecModel, parameter: Parameter, text: string): unknown => {
  const types = parameter.schema ? getSchema(model, parameter.schema).types : [];
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
