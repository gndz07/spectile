# @spectile/headless

The behavior behind an API reference (search, navigation, expandable schema trees, keyboard support, trying requests), without any rendering. Works with any framework or none.

```sh
npm install @spectile/core @spectile/headless
```

If you use React, you probably want `@spectile/react`, which wraps everything here.

## How it works

Every feature is a small **store**:

- `getSnapshot()` returns the current state.
- `subscribe(listener)` calls you when it changes, and returns an unsubscribe function.
- Methods like `toggle(id)` or `setQuery(text)` change it.

Stores also give you **prop getters**, such as `getRowProps(row)`. They return plain objects with the right ARIA attributes, `data-*` attributes and event handlers. Spread them onto your elements and accessibility and keyboard support just work.

Snapshots only change when something actually changed, so they plug straight into React's `useSyncExternalStore`, Vue's `shallowRef`, Svelte stores and so on.

## Navigation

The list of operations: search, grouping by tag, and the selected operation.

```ts
import { createNavigation } from "@spectile/headless"

const nav = createNavigation(model, { activeId: "listPets" })

nav.setQuery("get pets")
const { groups, resultCount, active } = nav.getSnapshot()
```

- **Search** matches method, path, operationId, summary and tags, and "webhook" for webhooks. Every word must match.
- **`groups`**: `[{ kind, tag, operations }]` in the spec's tag order. Untagged operations follow with no `tag`, then webhooks in one group with `kind: "webhook"`. Empty groups are left out.
- **`active`**: the selected operation or webhook.

Prop getters:

```ts
nav.getSearchProps() // { type: "search", value, onChange }
nav.getItemProps(operation) // { "aria-current", "data-state": "active" | "inactive", "data-method", onClick }
```

**Keyboard tree.** The groups and operations can be one WAI-ARIA tree, with the same keys as the [schema tree](#schema-tree) and groups that fold. Pass the group to `getItemProps` to make an item part of it:

```ts
nav.getTreeProps() // { role: "tree" }
nav.getGroupProps(group) // role: "treeitem", tabIndex, aria-expanded, data-state, onKeyDown, onFocus
nav.getGroupToggleProps(group) // onClick opens or closes the group
nav.getItemProps(operation, group) // adds role, tabIndex, onKeyDown, onFocus
```

The snapshot's `rows` lists the visible groups and items in order, and `focusedId` / `tabStopId` work as in the schema tree. `toggle(id)` and `focus(id)` take a row id (`groupKey(group)` or `itemKey(group, operation)`). Every group opens while a search is active.

Helpers:

```ts
matchRanges("List pets", "pet") // [{ start: 5, end: 8 }], for highlighting matches
isSearchShortcut(event) // "/" pressed outside a text field
operationHash("listPets") // "#listPets"; parseOperationHash(location.hash) reverses it
firstGroupOf(model, "listPets") // the first group listing it, e.g. for a breadcrumb
```

## Schema tree

An expandable tree of a schema's properties, following the WAI-ARIA tree pattern.

```ts
import { createSchemaTree } from "@spectile/headless"

// any SchemaRef from the model, e.g. a response's media.schema
const tree = createSchemaTree(model, schemaRef, { defaultExpandedDepth: 1 })

const { root, rows } = tree.getSnapshot()
```

`rows` is a flat list of the visible rows, ready to render in order. Use `depth` to indent. Each row has:

- `id`, `parentId`, `depth`
- `kind`: `property`, `items`, `additionalProperties`, `allOf`, `oneOf`, `anyOf` or `not`
- `name`, `required`
- `node`: the full `SchemaNode` (types, description, constraints…)
- `expandable`, `expanded`
- `recursive`: this schema already appears above this row. "Expand all" stops here, so circular schemas don't expand forever; you can still open them by hand.
- `recursiveTarget`: on a recursive row, the id of that ancestor row, for a link back to it
- `variants`: on a oneOf/anyOf row, `{ kind, labels, selected }`. Labels use the schema's title, then the discriminator value, then its name, then "Option n". Only the selected variant's fields are listed, and each variant keeps its own expanded rows. A selected variant that is itself a oneOf/anyOf gets a row of its own, with its own `variants`.

When the schema itself is a oneOf/anyOf, the first row is a synthetic root row that holds the variant choice. `allOf` parts are merged into one list of properties.

The snapshot also has `allExpanded`, for an Expand all / Collapse all toggle.

**Options:** `createSchemaTree(model, ref, { defaultExpandedDepth, usage, recursion })`.

- `defaultExpandedDepth`: how many levels start open. An array's item row doesn't count as a level, so `1` opens `pets` and the fields of each pet.
- `usage`: `"request"` leaves out readOnly properties and `"response"` leaves out writeOnly ones. Their names, at any depth, are in the snapshot's `hiddenNames`, so you can say they were left out.
- `recursion`: `"expandOnce"` (the default) lets a recursive row expand one more level before linking back; `"link"` only links back.

Actions: `expand(id)`, `collapse(id)`, `toggle(id)`, `expandAll()`, `collapseAll()`, `focus(id)`, `selectVariant(id, index)`.

Prop getters:

```ts
tree.getTreeProps() // { role: "tree" }
tree.getRowProps(row) // role, aria-level, aria-setsize, aria-posinset, aria-expanded, tabIndex, data-state,
// data-depth, data-kind, data-required, data-recursive, data-deprecated, onKeyDown, onClick, onFocus
tree.getVariantSelectProps(row) // value, onChange, for a <select> whose option values are indexes into row.variants.labels
```

Clicks and keys from a control inside a row, such as the variant select, are left to that control.

**Keyboard support:**

| Key           | Action                             |
| ------------- | ---------------------------------- |
| ↓ / ↑         | next / previous row                |
| →             | expand, or move to the first child |
| ←             | collapse, or move to the parent    |
| Home / End    | first / last row                   |
| Enter / Space | toggle                             |

Only one row is in the tab order (`tabStopId`). The snapshot's `focusedId` tells you which row should have DOM focus. Moving that focus is up to you.

## Try it

Fill in a request, send it and show the response.

```ts
import { createTryIt } from "@spectile/headless"

const tryIt = createTryIt(model) // one per spec
tryIt.setCredential("apiKey", "secret") // shared by every operation

const getPet = tryIt.forOperation("getPet")
getPet.setParameter("path.petId", "7")
await getPet.send()

const { draft, request, missing, result } = getPet.getSnapshot()
```

- **`draft`**: what the user typed. It starts with the spec's examples; the body starts as an example built from the schema. Each operation keeps its own draft, so switching between operations doesn't lose input. `reset()` restores the starting values.
- **`request`**: the request that will be sent, rebuilt on every change. Pass it to `toCurl` for a code sample. A required parameter that's still empty shows as `{name}` in its place (URL, query or header) and is listed in `request.placeholders`; core's `toCurlTokens` marks it so you can style it.
- **`missing`**: required parameters still empty. `send()` refuses to send while this isn't empty, or while `missingBody` (a required body left empty) is true.
- **`result`**: `idle`, `pending`, `done` (with `response`: `status`, `headers`, `body`, `duration`, `size`) or `error` (with `error`, and `network: true` when no response came back). A 404 or 500 is still `done`: a response arrived. `formatDuration` and `formatBytes` turn `duration` and `size` into `85 ms` and `1.5 KB`. Header names are lowercase. JSON bodies are indented without being re-parsed, so large numbers stay exact. Binary bodies (images, PDFs…) come as `response.blob`, with an empty `body`.
- `cancel()` stops a request in flight. Sending again replaces the previous request.

Parameter inputs are text: list values are separated by commas, and object values are JSON. They're converted to what the schema expects before the request is built.

**Form and multipart bodies** are filled in field by field. The snapshot's `bodyFields` has one entry per property of the body's schema (empty for other bodies, which stay a single text `body`). Typed fields work like parameters; file fields hold the chosen files.

```ts
const upload = tryIt.forOperation("uploadPhoto")
upload.setField("caption", "Sunday nap") // draft.fields
upload.setFiles("photo", [file]) // draft.files; File objects from an <input type="file">

const { bodyFields, missingFields } = upload.getSnapshot()
```

`send()` also refuses while a required field is empty (`missingFields`). Requests with files are sent as a `Blob`, so the multipart boundary stays correct.

**Content types.** When a body accepts several, `setMediaType("application/xml")` picks one (`draft.mediaType`) and swaps in that type's example.

**Servers.** Each operation sends to one of its own `servers` (the operation's, its path's, or the spec's), starting with the first.

```ts
getPet.selectServer(1) // index into operation.servers
getPet.setServerVariable("region", "us") // fills in {region}
getPet.setServerUrl("http://localhost:3000") // typed by hand; wins until another server or variable is chosen

const { serverIndex, serverVariables, serverUrl, typedServerUrl } = getPet.getSnapshot()
```

`serverUrl` is where requests go. `typedServerUrl` is what was typed by hand, and `undefined` while the chosen server is used. A typed URL left blank sends to the chosen server.

The choice is shared by operations with the same server list. Picking a server for one endpoint picks it for every endpoint that uses the spec's servers, while an endpoint with its own servers keeps its own choice.

**Options:** `createTryIt(model, { fetch, baseUrl, storage, storageKey })`.

- `fetch`: pass your own to route requests through a proxy, add logging, or test without a network.
- `baseUrl`: where the spec was loaded from. Relative server URLs such as `/api/v3` are resolved against it, as the OpenAPI spec says.
- `storage`: keeps credentials so they survive a reload. Without it, they're only kept in memory and a reload clears them. `sessionStorage` keeps them until the tab closes, while `localStorage` keeps them until the user clears them.
- `storageKey`: defaults to `spectile:credentials:` plus the spec's title and a hash of its server URLs, so specs on the same site don't share credentials, nor do two versions or environments of one API. To share them, give the specs the same key; credentials are stored by security scheme name, so only schemes with the same name carry over.

Only credentials are stored, never drafts or responses, and nothing is written until one is entered. Once the last one is cleared, the entry is removed. If the browser blocks storage, credentials just stay in memory.

**Prop getters:**

```ts
getPet.getFormProps() // onSubmit sends; data-state: idle | pending | done | error
getPet.getParameterProps(parameter) // name, value, required, onChange
getPet.getBodyProps() // name, value, onChange
getPet.getMediaTypeSelectProps() // value, onChange, for a <select> of content types
upload.getFieldProps(field) // name, value, required, onChange; files: type: "file", multiple, accept, no value
getPet.getSendProps() // type: "submit", disabled and aria-busy while pending
getPet.getServerProps() // the server URL: name, inputMode: "url", value, onChange
getPet.getServerSelectProps() // for a <select> whose option values are server indexes
getPet.getServerVariableProps("region") // name, value, onChange
tryIt.getCredentialProps("apiKey") // or ("basic", "username" | "password")
```

> Browsers only let a page call another site's API if that API allows it (CORS). When a request fails for this reason, the error says so. Browsers also refuse to set the `Cookie` header, so cookie parameters and cookie API keys only work through a proxy.

## Labels and helpers

Pure functions, so every framework shows the same text:

```ts
schemaTypeLabel(node, model) // "Pet", "Pet[]", "string[]", "string | null", "string · email", "oneOf", "any"
schemaRowLabel(row) // property name, else title, else schema name, else "oneOf[0]"
schemaDefaultLabel(node) // "= true", or undefined without a default
schemaAllowedValues(node) // { kind: "enum", values: ["asc", "desc"] }, { kind: "const", … } or undefined
schemaConstraintsLabel(node) // "≥ 1 · ≤ 100", "at most 5 items"
variantLabel(model, node, 0) // "Cat"
groupParameters(operation.parameters) // [{ location: "path", parameters }, …] in path, query, header, cookie order
defaultExampleResponse(operation) // the first 2xx response with a body, for an example panel
```

## JSON viewer

A tokenizer and a small fold store for showing JSON bodies with collapsible objects and arrays.

```ts
import { codeLines, createJsonFolds, nestedFolds, visibleJsonLines } from "@spectile/headless"

const lines = codeLines(body) // plain lines when it isn't JSON; jsonLines(body) returns undefined instead
const folds = createJsonFolds(nestedFolds(lines, 1)) // start nested objects and arrays of them folded
const visible = visibleJsonLines(lines, folds.getSnapshot().folded)
```

- Each line has `depth` and `tokens` (`{ kind, text }`, with `kind` one of `key`, `string`, `number`, `boolean`, `null`, `punctuation`, `ellipsis` or `text`). Numbers keep their original text, so large ids stay exact.
- A line that opens an object or array has `fold`: its `path` (a JSON pointer), the `end` line and `size`, its number of entries, for labels like "3 items". A folded line closes on the same line: `{ … }`.
- `nestedFolds(lines, depth)` lists the folds from `depth` down: objects, and arrays holding objects or arrays. Arrays of plain values stay open.
- `folds.toggle(path)` and `folds.getToggleProps(path)` (`type: "button"`, `aria-expanded`, `data-state`, `onClick`). For a new body, `folds.setDefaults(nestedFolds(newLines, 1))` replaces what starts folded and keeps what the reader toggled, by path, so their choices survive a new body of the same shape.

## Building your own store

The store tools are exported if you want to add features in the same style:

```ts
import { createStore, select } from "@spectile/headless"

const store = createStore({ open: false })
store.setState({ open: true }) // merge; no-op if nothing changed
store.setState((state) => ({ ...state, open: !state.open }))

const label = select(store, (state) => (state.open ? "Hide" : "Show")) // derived, cached
```
