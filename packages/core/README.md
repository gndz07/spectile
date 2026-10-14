# @spectile/core

Turns an OpenAPI document into a simple, render-ready model. No UI, no framework.

```sh
npm install @spectile/core
```

## Quick start

```ts
import { normalize } from "@spectile/core";
import { loadSpec } from "@spectile/core/loader";

const { document, warnings } = await loadSpec("https://petstore3.swagger.io/api/v3/openapi.json");
const model = normalize(document);

model.operations; // every endpoint, ready to render
```

## The two entry points

| Import | What it does | Size |
| --- | --- | --- |
| `@spectile/core` | `normalize`, `getSchema` and the model types | small |
| `@spectile/core/loader` | `loadSpec`: parses, bundles, upgrades and validates | ~390 KB |

The loader is separate because the parser is large. If you build the model ahead of time (on the server or at build time), the browser never needs it. In the browser you can load it on demand:

```ts
const { loadSpec } = await import("@spectile/core/loader");
```

## `loadSpec(input, options?)`

Reads a spec and returns one bundled OpenAPI 3.1 document.

- `input`: YAML or JSON text, a URL (string or `URL`), or an object. File paths aren't supported; in Node, read the file and pass the text.
- `options.validate`: check the document against the OpenAPI schema. Default `true`. Turn it off for large specs to save time.
- Swagger 2.0 and OpenAPI 3.0 are upgraded to 3.1 automatically.
- Returns `{ document, warnings }`. Validation problems become warnings; it only throws when the input isn't an API description at all.
- Never changes the object you pass in.

## `normalize(document)`

Builds the `SpecModel`:

```ts
{
  info,            // { title, version, summary?, description? }
  operations,      // NormalizedOperation[]
  tags,            // [{ name, description? }]
  securitySchemes, // apiKey, http, oauth2, openIdConnect, mutualTLS
  servers,         // [{ url, description?, variables }]
  warnings,        // problems found while normalizing
  document,        // the original document
}
```

Each operation is complete on its own, so you don't need to look anything up:

- `id`: the `operationId`, or a slug like `get-users-id` when there isn't one. Always unique.
- `method`, `path`, `summary`, `description`, `tags`, `deprecated`
- `parameters`: path-level and operation-level parameters, merged (the operation's win).
- `requestBody`, `responses`: each with its content types, schemas and examples.
- `security`, `servers`: inherited from the top level when the operation doesn't set its own. `security: []` means "no auth".

The model is plain JSON. You can `JSON.stringify` it, cache it, or send it from a server to the browser.

## `getSchema(model, pointer)`

Schemas aren't expanded up front. Operations hold a `SchemaRef`:

```ts
{ pointer: "#/components/schemas/Pet", refName: "Pet", circular: false }
```

Call `getSchema` to read one level of it:

```ts
const pet = getSchema(model, ref.pointer);
pet.types;      // ["object"]
pet.properties; // [{ name, required, schema: SchemaRef }]
```

Children are `SchemaRef`s too, so you only resolve what you show. This is what makes circular schemas (a `User` with `friends: User[]`) safe: `circular: true` marks a reference back to a schema that's already being resolved.

Along the way it also:

- Keeps the schema's name in `refName`, so you can show `Pet` instead of `object`.
- Turns 3.0 `nullable: true` into `types: [..., "null"]`.
- Collects limits like `minLength` and `pattern` under `constraints`.

## Building requests

Pure helpers for a "try it" feature or code samples. They build requests but never send them.

```ts
import { buildRequest, missingParameters, resolveServerUrl, toCurl } from "@spectile/core";

const request = buildRequest(model, operation, {
  serverUrl: resolveServerUrl(model.servers[0]),   // fills in {variables} with their defaults
  parameters: { "path.petId": "7", "query.tags": ["a", "b"] },
  body: '{"name":"Rex"}',
  mediaType: "application/json",
  credentials: { apiKey: "secret" },
});
// { method: "POST", url: "https://…/pets/7?tags=a&tags=b", headers: {…}, body: "…" }

toCurl(request); // curl -X POST 'https://…' -H '…' --data '…'
```

- **Parameters** are keyed by `parameterKey(parameter)`, which is `"<in>.<name>"`. Arrays and objects follow the parameter's `style` and `explode`, as the OpenAPI spec says. Empty values are left out.
- **Credentials** are keyed by security scheme name. A token or API key is a string; HTTP Basic is `{ username, password }`. The first security requirement with every credential filled in is used.
- `missingParameters(operation, values)` lists required parameters that have no value.

`exampleFromSchema(model, schemaRef)` creates a sample value, e.g. to pre-fill a request body. It uses the schema's own examples and defaults first, then makes one up from the types and formats. It stops at circular references, and leaves out `readOnly` properties (or `writeOnly` ones with `{ usage: "response" }`).

## Warnings instead of errors

Broken references, duplicate operation ids and invalid parameters don't stop rendering. Each one becomes an `Issue`:

```ts
{ code: "unresolved-ref", message: "...", pointer: "#/paths/~1pets/get" }
```

Show them, log them or ignore them.

## Types

All model types are exported: `SpecModel`, `NormalizedOperation`, `SchemaNode`, `SchemaRef`, `Parameter`, `Response`, `SecurityScheme`, `Issue` and more.

```ts
import type { NormalizedOperation } from "@spectile/core";
```
