import { findCyclic } from "../graph";
import { getAtPointer } from "../json/pointer";
import { entries } from "../json/read";
import { refOf } from "../json/refs";
import type { OpenAPIDocument } from "../model";
import { resolveSchema } from "./resolve";

const VALUE_KEYS = new Set(["example", "examples", "default", "const", "enum"]);
const SCHEMA_MAP_KEYS = new Set(["properties", "patternProperties", "$defs", "dependentSchemas"]);

const collectRefs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectRefs);
  const ref = refOf(value);
  return [
    ...(ref === undefined ? [] : [ref]),
    ...entries(value).flatMap(([key, child]) => {
      if (VALUE_KEYS.has(key)) return [];
      if (SCHEMA_MAP_KEYS.has(key)) return entries(child).flatMap(([, schema]) => collectRefs(schema));
      return collectRefs(child);
    }),
  ];
};

const buildRefGraph = (document: unknown) => {
  const targetOf = (ref: string) => resolveSchema(document, ref).pointer;
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

const cyclicCache = new WeakMap<OpenAPIDocument, ReadonlySet<string>>();

export const cyclicPointers = (document: OpenAPIDocument) => {
  const cached = cyclicCache.get(document);
  if (cached) return cached;
  const cyclic = findCyclic(buildRefGraph(document));
  cyclicCache.set(document, cyclic);
  return cyclic;
};
