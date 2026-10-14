import type {
  Constraints,
  Discriminator,
  NumericConstraint,
  OpenAPIDocument,
  SchemaNode,
  SchemaRef,
  SchemaType,
  SpecModel,
} from "../model";
import { appendPointer, escapeSegment, getAtPointer, unescapeSegment } from "./pointer";
import { type JsonObject, asArray, asBoolean, asString, entries, isObject, isOneOf } from "./read";
import { refOf, resolvePointer } from "./refs";

const SCHEMA_PREFIX = "#/components/schemas/";

const isSchemaType = isOneOf<SchemaType>([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
]);

const NUMERIC_CONSTRAINTS: readonly NumericConstraint[] = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minProperties",
  "maxProperties",
];

const VALUE_KEYS = new Set(["example", "examples", "default", "const", "enum"]);
const SCHEMA_MAP_KEYS = new Set(["properties", "patternProperties", "$defs", "dependentSchemas"]);

const collectRefs = (value: unknown): string[] => {
  const ref = refOf(value);
  if (ref !== undefined) return [ref];
  if (Array.isArray(value)) return value.flatMap(collectRefs);
  return entries(value).flatMap(([key, child]) => {
    if (VALUE_KEYS.has(key)) return [];
    if (SCHEMA_MAP_KEYS.has(key)) return entries(child).flatMap(([, schema]) => collectRefs(schema));
    return collectRefs(child);
  });
};

const buildRefGraph = (document: unknown) => {
  const targetOf = (ref: string) => resolvePointer(document, ref).pointer;
  const graph = new Map<string, string[]>();
  const pending = collectRefs(document).map(targetOf);
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (graph.has(node)) continue;
    const edges = collectRefs(getAtPointer(document, node)).map(targetOf);
    graph.set(node, edges);
    pending.push(...edges);
  }
  return graph;
};

const findCyclic = (graph: ReadonlyMap<string, readonly string[]>) => {
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cyclic = new Set<string>();

  const visit = (node: string) => {
    const order = index.size;
    index.set(node, order);
    lowLink.set(node, order);
    stack.push(node);
    onStack.add(node);
    const edges = graph.get(node) ?? [];
    for (const next of edges) {
      if (!index.has(next)) visit(next);
      if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node) ?? order, lowLink.get(next) ?? order));
      }
    }
    if (lowLink.get(node) !== order) return;
    const component: string[] = [];
    for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1 || edges.includes(node)) component.forEach((m) => cyclic.add(m));
  };

  graph.forEach((_, node) => {
    if (!index.has(node)) visit(node);
  });
  return cyclic;
};

const cyclicCache = new WeakMap<OpenAPIDocument, ReadonlySet<string>>();

const cyclicPointers = (document: OpenAPIDocument) => {
  const cached = cyclicCache.get(document);
  if (cached) return cached;
  const cyclic = findCyclic(buildRefGraph(document));
  cyclicCache.set(document, cyclic);
  return cyclic;
};

const schemaRefName = (pointer: string) => {
  if (!pointer.startsWith(SCHEMA_PREFIX)) return undefined;
  const name = pointer.slice(SCHEMA_PREFIX.length);
  return name.includes("/") ? undefined : unescapeSegment(name);
};

const refTo = (document: OpenAPIDocument, target: string): SchemaRef => ({
  pointer: target,
  refName: schemaRefName(target),
  circular: cyclicPointers(document).has(target),
});

export const schemaRef = (document: OpenAPIDocument, pointer: string): SchemaRef =>
  refTo(document, resolvePointer(document, pointer).pointer);

const inferTypes = (schema: JsonObject): SchemaType[] => {
  if (isObject(schema.properties) || schema.additionalProperties !== undefined) return ["object"];
  return schema.items === undefined ? [] : ["array"];
};

const schemaTypes = (schema: JsonObject): SchemaType[] => {
  const declared = (Array.isArray(schema.type) ? schema.type : [schema.type]).filter(isSchemaType);
  const types = declared.length > 0 ? declared : inferTypes(schema);
  const addNull = schema.nullable === true && types.length > 0 && !types.includes("null");
  return addNull ? [...types, "null"] : types;
};

const constraintsOf = (schema: JsonObject): Constraints => ({
  ...(Object.fromEntries(
    NUMERIC_CONSTRAINTS.flatMap((key) =>
      typeof schema[key] === "number" ? [[key, schema[key]] as const] : [],
    ),
  ) as { [K in NumericConstraint]?: number }),
  pattern: asString(schema.pattern),
  uniqueItems: schema.uniqueItems === true || undefined,
});

const discriminatorOf = (document: OpenAPIDocument, value: unknown): Discriminator | undefined => {
  if (!isObject(value) || typeof value.propertyName !== "string") return undefined;
  const mapping = entries(value.mapping).flatMap(([key, target]) => {
    if (typeof target !== "string") return [];
    const pointer = target.startsWith("#") ? target : SCHEMA_PREFIX + escapeSegment(target);
    return [[key, schemaRef(document, pointer)] as const];
  });
  return { propertyName: value.propertyName, mapping: Object.fromEntries(mapping) };
};

export const getSchema = (model: SpecModel, pointer: string): SchemaNode => {
  const { document } = model;
  const resolution = resolvePointer(document, pointer);
  const schema = isObject(resolution.value) ? resolution.value : {};
  const child = (...segments: (string | number)[]) =>
    schemaRef(document, appendPointer(resolution.pointer, ...segments));
  const optionalChild = (key: string) => (isObject(schema[key]) ? child(key) : undefined);
  const childList = (key: string) => asArray(schema[key]).map((_, index) => child(key, index));
  const required = new Set(asArray(schema.required));

  return {
    ...refTo(document, resolution.pointer),
    types: schemaTypes(schema),
    title: asString(schema.title),
    description: asString(schema.description),
    format: asString(schema.format),
    deprecated: asBoolean(schema.deprecated),
    readOnly: asBoolean(schema.readOnly),
    writeOnly: asBoolean(schema.writeOnly),
    enum: Array.isArray(schema.enum) ? schema.enum : undefined,
    const: schema.const,
    default: schema.default,
    examples: Array.isArray(schema.examples)
      ? schema.examples
      : "example" in schema
        ? [schema.example]
        : [],
    constraints: constraintsOf(schema),
    properties: entries(schema.properties).map(([name]) => ({
      name,
      required: required.has(name),
      schema: child("properties", name),
    })),
    additionalProperties:
      typeof schema.additionalProperties === "boolean"
        ? schema.additionalProperties
        : optionalChild("additionalProperties"),
    items: optionalChild("items"),
    allOf: childList("allOf"),
    oneOf: childList("oneOf"),
    anyOf: childList("anyOf"),
    not: optionalChild("not"),
    discriminator: discriminatorOf(document, schema.discriminator),
    issue: resolution.issue,
  };
};
