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

- **Search** matches method, path, operationId, summary and tags. Every word must match.
- **`groups`**: `[{ tag, operations }]` in the spec's tag order. Untagged operations come last with no `tag`. Empty groups are left out.
- **`active`**: the selected operation.

Prop getters:

```ts
nav.getSearchProps() // { type: "search", value, onChange }
nav.getItemProps(operation) // { "aria-current", "data-state": "active" | "inactive", "data-method", onClick }
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

Actions: `expand(id)`, `collapse(id)`, `toggle(id)`, `expandAll()`, `collapseAll()`, `focus(id)`.

Prop getters:

```ts
tree.getTreeProps() // { role: "tree" }
tree.getRowProps(row) // role, aria-level, aria-expanded, tabIndex, data-state, data-depth, data-kind,
// data-required, data-recursive, data-deprecated, onKeyDown, onClick, onFocus
```

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

Fill in a request, send it and show the response, like Swagger's "Try it out".

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
- **`request`**: the request that will be sent, rebuilt on every change. Pass it to `toCurl` for a code sample.
- **`missing`**: required parameters still empty. `send()` refuses to send while this isn't empty, or while `missingBody` (a required body left empty) is true.
- **`result`**: `idle`, `pending`, `done` (with `response`: `status`, `headers`, `body`, `duration`) or `error` (with `error`). A 404 or 500 is still `done`: a response arrived. Header names are lowercase. JSON bodies are indented without being re-parsed, so large numbers stay exact. Binary bodies (images, PDFs…) come as `response.blob`, with an empty `body`.
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

**Servers.** Each operation sends to one of its own `servers` (the operation's, its path's, or the spec's), starting with the first.

```ts
getPet.selectServer(1) // index into operation.servers
getPet.setServerVariable("region", "us") // fills in {region}
getPet.setServerUrl("http://localhost:3000") // typed by hand; wins until another server or variable is chosen

const { serverIndex, serverVariables, serverUrl } = getPet.getSnapshot()
```

The choice is shared by operations with the same server list. Picking a server for one endpoint picks it for every endpoint that uses the spec's servers, while an endpoint with its own servers keeps its own choice.

**Options:** `createTryIt(model, { fetch, baseUrl })`.

- `fetch`: pass your own to route requests through a proxy, add logging, or test without a network.
- `baseUrl`: where the spec was loaded from. Relative server URLs such as `/api/v3` are resolved against it, as the OpenAPI spec says.

**Prop getters:**

```ts
getPet.getFormProps() // onSubmit sends; data-state: idle | pending | done | error
getPet.getParameterProps(parameter) // name, value, required, onChange
getPet.getBodyProps() // name, value, onChange
upload.getFieldProps(field) // name, value, required, onChange; files: type: "file", multiple, accept, no value
getPet.getSendProps() // type: "submit", disabled and aria-busy while pending
getPet.getServerProps() // the server URL: name, inputMode: "url", value, onChange
getPet.getServerSelectProps() // for a <select> whose option values are server indexes
getPet.getServerVariableProps("region") // name, value, onChange
tryIt.getCredentialProps("apiKey") // or ("basic", "username" | "password")
```

> Browsers only let a page call another site's API if that API allows it (CORS). When a request fails for this reason, the error says so. Browsers also refuse to set the `Cookie` header, so cookie parameters and cookie API keys only work through a proxy.

## Labels

Pure helpers so every framework shows the same text:

```ts
schemaTypeLabel(node, model) // "Pet", "Pet[]", "string[]", "string | null", "oneOf", "any"
schemaRowLabel(row) // property name, else title, else schema name, else "oneOf[0]"
```

## Building your own store

The store tools are exported if you want to add features in the same style:

```ts
import { createStore, select } from "@spectile/headless"

const store = createStore({ open: false })
store.setState({ open: true }) // merge; no-op if nothing changed
store.setState((state) => ({ ...state, open: !state.open }))

const label = select(store, (state) => (state.open ? "Hide" : "Show")) // derived, cached
```
